import express from 'express';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Patient from '../models/Patient.js';
import Bill from '../models/Bill.js';
import Admission from '../models/Admission.js';
import Notice from '../models/Notice.js';
import Appointment from '../models/Appointment.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';

const router = express.Router();

/* ─── USERS ─── */

router.get('/users', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 }).lean();
    res.json(users.map(u => ({ ...u, id: (u._id as any).toString() })));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/users', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  const { name, email, password, role, specialty, schedule } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'Name, email, password, and role are required' });
  }
  try {
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email: email.toLowerCase(), password: hashed, role, specialty, schedule });
    res.status(201).json({ id: (user._id as any).toString(), name: user.name, role: user.role });
  } catch (err: any) {
    if (err.code === 11000) return res.status(409).json({ error: 'Email already exists' });
    res.status(500).json({ error: 'Failed to create user' });
  }
});

router.put('/users/:id', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  const { name, email, role, specialty, schedule, is_active, password, permissions } = req.body;
  try {
    const update: Record<string, any> = { name, role, specialty, schedule, is_active };
    if (email) update.email = email.toLowerCase();
    if (password) update.password = await bcrypt.hash(password, 10);
    if (Array.isArray(permissions)) update.permissions = permissions;
    const user = await User.findByIdAndUpdate(req.params.id, update, { returnDocument: 'after' }).select('-password').lean();
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ ...user, id: (user._id as any).toString() });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/users/:id', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/* ─── DOCTOR PROFILE STATS ─── */

router.get('/doctors/:id/stats', authenticateToken, async (req: any, res) => {
  try {
    const { id } = req.params;
    const doctorId = new mongoose.Types.ObjectId(id);
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const sevenDaysAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [totalAppts, completedAppts, patientIds, byDay, upcoming] = await Promise.all([
      Appointment.countDocuments({ doctor: doctorId }),
      Appointment.countDocuments({ doctor: doctorId, status: 'completed' }),
      Appointment.distinct('patient', { doctor: doctorId }),
      Appointment.aggregate([
        { $match: { doctor: doctorId, date: { $gte: sevenDaysAgo } } },
        { $group: { _id: { day: { $dayOfWeek: '$date' }, status: '$status' }, count: { $sum: 1 } } },
      ]),
      (Appointment as any).find({ doctor: doctorId, date: { $gte: now, $lte: sevenDaysAhead } })
        .populate('patient', 'name patient_id')
        .sort({ date: 1 })
        .limit(10)
        .lean(),
    ]);

    res.json({
      total_appointments: totalAppts,
      total_patients: patientIds.length,
      performance: totalAppts > 0 ? Math.round((completedAppts / totalAppts) * 100) : 0,
      by_day: byDay,
      upcoming,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/* ─── STATS ─── */

router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const [patients, doctors, appointments, billing] = await Promise.all([
      Patient.countDocuments(),
      User.countDocuments({ role: 'doctor' }),
      Appointment.countDocuments({ status: 'scheduled' }),
      Bill.aggregate([{ $match: { status: 'paid' } }, { $group: { _id: null, total: { $sum: '$total' } } }]),
    ]);
    res.json({
      patients,
      doctors,
      appointments,
      revenue: billing[0]?.total || 0,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Stats error: ' + err.message });
  }
});

/* ─── NOTICES ─── */

router.get('/notices', authenticateToken, async (req, res) => {
  try {
    const notices = await Notice.find().sort({ createdAt: -1 }).lean();
    res.json(notices.map(n => ({ ...n, id: (n._id as any).toString(), created_at: n.createdAt })));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/notices', authenticateToken, authorizeRole(['admin']), async (req: any, res) => {
  const { title, content, type } = req.body;
  if (!title || !content) return res.status(400).json({ error: 'Title and content are required' });
  try {
    const notice = await Notice.create({ title, content, type: type || 'info', created_by: req.user.id });
    res.status(201).json({ id: (notice._id as any).toString() });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/notices/:id', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    await Notice.findByIdAndDelete(req.params.id);
    res.json({ message: 'Notice deleted' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/* ─── APPOINTMENTS ─── */

router.get('/appointments', authenticateToken, async (req: any, res) => {
  try {
    const filter: any = {};
    if (req.query.status) filter.status = req.query.status;
    else filter.status = 'scheduled';
    if (req.query.doctor_id) filter.doctor = req.query.doctor_id;
    if (req.query.from && req.query.to) {
      filter.date = { $gte: new Date(req.query.from as string), $lte: new Date(req.query.to as string) };
    }
    const appts = await Appointment.find(filter)
      .populate('patient', 'name patient_id phone age gender')
      .populate('doctor', 'name specialty')
      .sort({ date: 1, time: 1 })
      .lean();
    res.json(appts.map((a: any) => ({
      ...a,
      id: a._id.toString(),
      patient: a.patient ? { ...a.patient, id: a.patient._id.toString() } : null,
      doctor: a.doctor ? { ...a.doctor, id: a.doctor._id.toString() } : null,
    })));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/appointments', authenticateToken, async (req: any, res) => {
  const { patient_id, doctor_id, date, time, type, notes } = req.body;
  if (!patient_id || !date) return res.status(400).json({ error: 'Patient ID and date are required' });
  try {
    const appt = await Appointment.create({
      patient: patient_id,
      doctor: doctor_id || req.user.id,
      date: new Date(date),
      time: time || '10:00',
      type: type || 'review',
      notes: notes || '',
    });
    const populated = await Appointment.findById(appt._id)
      .populate('patient', 'name patient_id phone age gender')
      .populate('doctor', 'name specialty')
      .lean() as any;
    res.status(201).json({
      ...populated,
      id: populated._id.toString(),
      patient: populated.patient ? { ...populated.patient, id: populated.patient._id.toString() } : null,
      doctor: populated.doctor ? { ...populated.doctor, id: populated.doctor._id.toString() } : null,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/appointments/:id', authenticateToken, async (req: any, res) => {
  try {
    const { status, date, time, type, notes, doctor_id } = req.body;
    const updates: any = {};
    if (status) updates.status = status;
    if (date) updates.date = new Date(date);
    if (time) updates.time = time;
    if (type) updates.type = type;
    if (notes !== undefined) updates.notes = notes;
    if (doctor_id) updates.doctor = doctor_id;
    const appt = await Appointment.findByIdAndUpdate(req.params.id, updates, { returnDocument: 'after' })
      .populate('patient', 'name patient_id phone')
      .populate('doctor', 'name specialty')
      .lean() as any;
    if (!appt) return res.status(404).json({ error: 'Appointment not found' });
    res.json({ ...appt, id: appt._id.toString() });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/* ─── ADMISSIONS ─── */

router.get('/admissions', authenticateToken, async (req, res) => {
  try {
    const list = await Admission.find({ status: 'admitted' })
      .populate('patient', 'name patient_id gender')
      .populate('admitted_by', 'name')
      .sort({ admission_date: -1 })
      .lean();
    const formatted = list.map((a: any) => ({
      ...a, id: a._id.toString(),
      patient_name: a.patient?.name, patient_id: a.patient?.patient_id,
      admitted_by_name: a.admitted_by?.name,
    }));
    res.json(formatted);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/admissions', authenticateToken, async (req: any, res) => {
  const { patient_id, reason, ward, urgency, notes } = req.body;
  if (!patient_id || !reason) return res.status(400).json({ error: 'Patient and reason are required' });
  try {
    const admission = await Admission.create({
      patient: patient_id, admitted_by: req.user.id,
      reason, ward: ward || '', urgency: urgency || 'routine', notes: notes || '',
    });
    res.status(201).json({ id: (admission._id as any).toString() });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/admissions/:id/discharge', authenticateToken, async (req, res) => {
  try {
    const admission = await Admission.findByIdAndUpdate(
      req.params.id,
      { status: 'discharged', discharge_date: new Date() },
      { returnDocument: 'after' }
    );
    if (!admission) return res.status(404).json({ error: 'Admission not found' });
    await Patient.findByIdAndUpdate(admission.patient, { status: 'discharged' });
    res.json({ message: 'Patient discharged' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/* ─── DASHBOARD ─── */

router.get('/dashboard', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now); sevenDaysAgo.setDate(now.getDate() - 6); sevenDaysAgo.setHours(0,0,0,0);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    // Age-group patients per day (last 7 days)
    const ageByDay = await Patient.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      { $addFields: {
        ageGroup: {
          $switch: {
            branches: [
              { case: { $lt: ['$age', 13] }, then: 'children' },
              { case: { $lt: ['$age', 18] }, then: 'teens' },
            ],
            default: 'adults'
          }
        },
        dayOfWeek: { $dayOfWeek: '$createdAt' }
      }},
      { $group: { _id: { day: '$dayOfWeek', group: '$ageGroup' }, count: { $sum: 1 } } },
    ]);

    // Department breakdown from doctor specialties on appointments
    const deptBreakdown = await Appointment.aggregate([
      { $lookup: { from: 'users', localField: 'doctor', foreignField: '_id', as: 'doc' } },
      { $unwind: { path: '$doc', preserveNullAndEmptyArrays: true } },
      { $group: { _id: '$doc.specialty', count: { $sum: 1 } } },
      { $match: { _id: { $nin: [null, ''] } } },
      { $sort: { count: -1 } }, { $limit: 6 },
    ]);

    // Revenue by month (this year)
    const revenueByMonth = await Bill.aggregate([
      { $match: { createdAt: { $gte: yearStart } } },
      { $group: {
        _id: { month: { $month: '$createdAt' }, status: '$status' },
        total: { $sum: '$total' }
      }},
      { $sort: { '_id.month': 1 } },
    ]);

    // Recent appointments (last 20) with patient + doctor
    const recentAppts = await Appointment.find()
      .populate('patient', 'name patient_id')
      .populate('doctor', 'name specialty')
      .sort({ date: -1 })
      .limit(20)
      .lean();

    // All doctors with availability
    const doctors = await User.find({ role: 'doctor' }).select('name specialty is_active').lean();

    // Recent activity: mix of notices + appointments + patients
    const [recentNotices, recentPatients] = await Promise.all([
      Notice.find().sort({ createdAt: -1 }).limit(3).lean(),
      Patient.find().sort({ createdAt: -1 }).limit(3).lean(),
    ]);

    res.json({
      ageByDay,
      deptBreakdown: deptBreakdown.map((d: any) => ({ dept: d._id || 'General', count: d.count })),
      revenueByMonth: revenueByMonth.map((r: any) => ({ month: r._id.month, status: r._id.status, total: r.total })),
      recentAppts: recentAppts.map((a: any) => ({
        id: a._id.toString(),
        patient_name: a.patient?.name || '',
        patient_id: a.patient?.patient_id || '',
        doctor_name: a.doctor?.name || '',
        doctor_specialty: a.doctor?.specialty || '',
        date: a.date,
        time: a.time,
        type: a.type,
        status: a.status,
      })),
      doctors: doctors.map((d: any) => ({
        id: d._id.toString(),
        name: d.name,
        specialty: d.specialty || 'General',
        available: d.is_active !== false,
      })),
      recentActivity: [
        ...recentPatients.map((p: any) => ({ type: 'patient', label: 'New patient profile created', sub: p.patient_id, time: p.createdAt })),
        ...recentNotices.map((n: any) => ({ type: 'notice', label: n.title, sub: n.content?.substring(0, 40), time: n.createdAt })),
      ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 6),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/* ─── ANALYTICS ─── */

router.get('/analytics', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const Consultation = (await import('../models/Consultation.js')).default;
    const Vitals       = (await import('../models/Vitals.js')).default;

    const now          = new Date();
    const sevenDaysAgo = new Date(now); sevenDaysAgo.setDate(now.getDate() - 7);
    const todayStart   = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const todayEnd     = new Date(now); todayEnd.setHours(23, 59, 59, 999);

    const [
      totalPatients,
      paidBillingAgg,
      totalStaff,
      todayAppts,
      activeAdmissions,
      pendingBillsAgg,
      visitAgg,
      revenueAgg,
      billingStatusAgg,
      patientPipelineAgg,
      roleAgg,
      nhisAgg,
      diagnosisAgg,
      missingCccCount,
    ] = await Promise.all([
      Patient.countDocuments(),
      Bill.aggregate([{ $match: { status: 'paid' } }, { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } }]),
      User.countDocuments(),
      Appointment.countDocuments({ status: 'scheduled', date: { $gte: todayStart, $lte: todayEnd } }),
      Admission.countDocuments({ status: 'admitted' }),
      Bill.aggregate([{ $match: { status: 'pending' } }, { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } }]),
      Patient.aggregate([
        { $match: { createdAt: { $gte: sevenDaysAgo } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Bill.aggregate([
        { $match: { status: 'paid', createdAt: { $gte: sevenDaysAgo } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, revenue: { $sum: '$total' } } },
        { $sort: { _id: 1 } },
      ]),
      Bill.aggregate([
        { $group: { _id: '$status', total: { $sum: '$total' }, count: { $sum: 1 } } },
      ]),
      Patient.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      User.aggregate([
        { $group: { _id: '$role', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Patient.aggregate([
        { $group: { _id: { $cond: [{ $gt: ['$nhis_number', ''] }, 'NHIS', 'Private'] }, count: { $sum: 1 } } },
      ]),
      Consultation.aggregate([
        { $group: { _id: '$illness', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 7 },
      ]),
      Vitals.countDocuments({ ccc_status: 'unable', status: 'pending' }),
    ]);

    res.json({
      summary: {
        totalPatients,
        totalRevenue:    paidBillingAgg[0]?.total  || 0,
        paidBills:       paidBillingAgg[0]?.count  || 0,
        totalStaff,
        todayAppts,
        activeAdmissions,
        pendingBillsTotal: pendingBillsAgg[0]?.total || 0,
        pendingBillsCount: pendingBillsAgg[0]?.count || 0,
        missingCccCount,
      },
      visitsByDay:      visitAgg.map((v: any)  => ({ date: v._id, count: v.count })),
      revenueByDay:     revenueAgg.map((r: any) => ({ date: r._id, revenue: r.revenue })),
      billingStatus:    billingStatusAgg.map((b: any) => ({ status: b._id, total: b.total, count: b.count })),
      patientPipeline:  patientPipelineAgg.map((p: any) => ({ status: p._id || 'unknown', count: p.count })),
      roleDistribution: roleAgg.map((r: any) => ({ role: r._id, count: r.count })),
      nhisVsPrivate:    nhisAgg.map((n: any) => ({ type: n._id, count: n.count })),
      topDiagnoses:     diagnosisAgg.map((d: any) => ({ illness: d._id, count: d.count })),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
