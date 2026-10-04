import { useEffect, useMemo, useState } from 'react';
import { Modal } from '../../../shared/components/Modal/Modal';
import { Button } from '../../../shared/components/Button/Button';
import { Input } from '../../../shared/components/Input/Input';
import { Select } from '../../../shared/components/Select/Select';
import { Alert } from '../../../shared/components/Alert/Alert';
import { Loading } from '../../../shared/components/Loading/Loading';
import { appointmentsApi, doctorsApi, patientsApi } from '../../../core/api/services';
import { ApiError } from '../../../core/api/client';
import type { Appointment, Doctor, Patient } from '../../../core/api/types';

interface Props { isOpen: boolean; onClose: () => void; onCreated: (appointment: Appointment) => void; }

export function AddAppointmentModal({ isOpen, onClose, onCreated }: Props) {
  const [patients, setPatients] = useState<Patient[]>([]); const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patientSearch, setPatientSearch] = useState(''); const [patientId, setPatientId] = useState<number>();
  const [doctorId, setDoctorId] = useState(''); const [date, setDate] = useState(''); const [time, setTime] = useState('');
  const [mode, setMode] = useState<'ONLINE' | 'WALK_IN'>('ONLINE'); const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false); const [error, setError] = useState<string>();
  const filteredPatients = useMemo(() => patients.filter((patient) => `${patient.fullName} ${patient.patientCode}`.toLowerCase().includes(patientSearch.toLowerCase())), [patients, patientSearch]);

  useEffect(() => { if (!isOpen) return; setPatientSearch(''); setPatientId(undefined); setDoctorId(''); setDate(''); setTime(''); setMode('ONLINE'); setError(undefined); setLoading(true);
    Promise.all([patientsApi.list({ size: 100, status: 'ACTIVE' }), doctorsApi.list({ size: 100 })]).then(([p, d]) => { setPatients(p.content.filter((x) => x.status === 'ACTIVE')); setDoctors(d.content.filter((x) => x.status === 'ACTIVE')); }).catch((e) => setError(e instanceof ApiError ? e.message : 'Could not load registered patients and doctors.')).finally(() => setLoading(false)); }, [isOpen]);

  async function submit(event: React.FormEvent) { event.preventDefault();
    if (!patientId || !doctorId || !date || !time) { setError('Select a registered patient and doctor, then choose a date and time.'); return; }
    const scheduledAt = new Date(`${date}T${time}`).toISOString();
    if (Number.isNaN(Date.parse(scheduledAt)) || new Date(scheduledAt) <= new Date()) { setError('Schedule the appointment for a future date and time.'); return; }
    setSubmitting(true); setError(undefined); try { const appointment = await appointmentsApi.book({ patientId, doctorId: Number(doctorId), scheduledAt, appointmentMode: mode }); onCreated(appointment); onClose(); } catch (e) { setError(e instanceof ApiError ? e.message : 'Could not book the appointment.'); } finally { setSubmitting(false); }
  }
  return <Modal isOpen={isOpen} onClose={onClose} title="Add appointment" description="Select registered people and reserve an available slot." size="md" footer={<><Button variant="ghost" onClick={onClose} disabled={submitting}>Cancel</Button><Button type="submit" form="add-appointment-form" isLoading={submitting} disabled={loading}>Book appointment</Button></>}>
    {loading ? <Loading label="Loading registered patients and doctors…" /> : <form id="add-appointment-form" onSubmit={submit} style={{ display: 'grid', gap: 'var(--mf-space-4)' }}>
      {error && <Alert tone="danger" title="Appointment could not be saved">{error}</Alert>}
      <div><Input label="Patient *" value={patientSearch} placeholder="Search registered patients" onChange={(e) => { setPatientSearch(e.target.value); setPatientId(undefined); }} aria-describedby="patient-search-help" /><small id="patient-search-help" style={{ color: 'var(--mf-text-muted)' }}>{patientId ? 'Registered patient selected.' : 'Choose a patient from the results; typed text is not submitted.'}</small>
        <div role="listbox" aria-label="Matching registered patients" style={{ maxHeight: 150, overflow: 'auto', marginTop: 6 }}>{filteredPatients.length ? filteredPatients.map((p) => <button type="button" role="option" aria-selected={patientId === p.id} key={p.id} onClick={() => { setPatientId(p.id); setPatientSearch(`${p.fullName} (${p.patientCode})`); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: 8, border: 0, background: patientId === p.id ? 'var(--mf-teal-50)' : 'transparent', cursor: 'pointer' }}>{p.fullName} <small>({p.patientCode})</small></button>) : <p style={{ margin: 8, color: 'var(--mf-text-muted)' }}>No registered patients found.</p>}</div></div>
      <Select label="Doctor *" value={doctorId} placeholder="Select a registered doctor" options={doctors.map((d) => ({ value: String(d.id), label: `${d.fullName} (${d.specialty})` }))} onChange={(e) => setDoctorId(e.target.value)} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--mf-space-3)' }}><Input label="Schedule date *" type="date" value={date} onChange={(e) => setDate(e.target.value)} /><Input label="Schedule time *" type="time" value={time} onChange={(e) => setTime(e.target.value)} /></div>
      <Select label="Mode *" value={mode} options={[{ value: 'ONLINE', label: 'Online' }, { value: 'WALK_IN', label: 'Walk in' }]} onChange={(e) => setMode(e.target.value as 'ONLINE' | 'WALK_IN')} />
    </form>}
  </Modal>;
}
