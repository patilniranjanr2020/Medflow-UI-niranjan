import { Link, useNavigate } from 'react-router-dom';
import {
  Users,
  Stethoscope,
  CalendarClock,
  FileText,
  IndianRupee,
  Activity as ActivityIcon,
  Bell,
  Plus,
} from 'lucide-react';
import { PageHeader } from '../../../shared/components/PageHeader/PageHeader';
import { Button } from '../../../shared/components/Button/Button';
import { Card, CardHeader, CardTitle, CardSubtitle, CardBody } from '../../../shared/components/Card/Card';
import { Table, type TableColumn } from '../../../shared/components/Table/Table';
import { Badge } from '../../../shared/components/Badge/Badge';
import { Avatar } from '../../../shared/components/Avatar/Avatar';
import { Alert } from '../../../shared/components/Alert/Alert';
import { Loading } from '../../../shared/components/Loading/Loading';
import { KpiCard } from '../components/KpiCard';
import { ActivityChart } from '../components/ActivityChart';
import { CalendarWidget } from '../components/CalendarWidget';
import { ActivityTimeline } from '../components/ActivityTimeline';
import { useApiResource } from '../../../shared/hooks/useApiResource';
import { analyticsApi, appointmentsApi, notificationsApi, patientsApi } from '../../../core/api/services';
import { formatDate, formatMoney, formatTime, humanize, statusTone } from '../../../core/utils/format';
import { ROUTES } from '../../../core/config/app.config';
import type { Appointment } from '../../../core/api/types';
import './DashboardPage.css';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const appointmentColumns: TableColumn<Appointment>[] = [
  {
    key: 'patient',
    header: 'Patient',
    render: (row) => (
      <div className="mf-dash-table__cell">
        <Avatar name={row.patientName} size="sm" />
        <span>{row.patientName}</span>
      </div>
    ),
  },
  { key: 'doctor', header: 'Doctor', render: (row) => row.doctorName },
  { key: 'time', header: 'Time', render: (row) => formatTime(row.scheduledAt) },
  {
    key: 'status',
    header: 'Status',
    render: (row) => (
      <Badge tone={statusTone(row.status)} dot>
        {humanize(row.status)}
      </Badge>
    ),
  },
];

export default function DashboardPage() {
  const navigate = useNavigate();

  const summary = useApiResource(() => analyticsApi.dashboard(), []);
  const activity = useApiResource(() => analyticsApi.activity(7), []);
  const appointments = useApiResource(() => appointmentsApi.list({ size: 5 }), []);
  const patients = useApiResource(() => patientsApi.list({ size: 4 }), []);
  const alerts = useApiResource(() => notificationsApi.list({ size: 3, unreadOnly: true }), []);

  const kpis = summary.data
    ? [
        {
          label: 'Revenue (MTD)',
          value: formatMoney(summary.data.revenueMonthToDate),
          icon: IndianRupee,
          variant: 'featured' as const,
          meta: 'Completed consultations this month',
        },
        { label: 'Total patients', value: String(summary.data.totalPatients), icon: Users, tone: 'blue' as const },
        { label: 'Doctors on staff', value: String(summary.data.doctorsOnStaff), icon: Stethoscope, tone: 'green' as const },
        { label: 'Appointments today', value: String(summary.data.appointmentsToday), icon: CalendarClock, tone: 'amber' as const },
        { label: 'Reports filed', value: String(summary.data.labReportsCompleted), icon: FileText, tone: 'coral' as const },
        { label: 'Active cases', value: String(summary.data.activeCases), icon: ActivityIcon, tone: 'green' as const },
      ]
    : [];

  const chartData = (activity.data ?? []).map((point) => ({
    label: WEEKDAYS[new Date(point.date).getDay()],
    value: point.visits,
  }));

  return (
    <div className="mf-dashboard">
      <PageHeader
        title="Dashboard"
        description="Here's what's moving across your clinic today."
        actions={
          <>
            <Button variant="outline" leftIcon={<Bell size={15} />} onClick={() => navigate(ROUTES.notifications)}>
              Notifications
            </Button>
            <Button leftIcon={<Plus size={16} />} onClick={() => navigate(ROUTES.appointments)}>
              New appointment
            </Button>
          </>
        }
      />

      {summary.error && (
        <Alert tone="danger" title="Could not load the dashboard">
          {summary.error}
        </Alert>
      )}

      <div className="mf-dashboard__kpis">
        {summary.isLoading && !summary.data
          ? <Loading label="Loading KPIs…" />
          : kpis.map((kpi) => <KpiCard key={kpi.label} delta="live" trend="up" {...kpi} />)}
      </div>

      <div className="mf-dashboard__grid">
        <div className="mf-dashboard__col mf-dashboard__col--main">
          <Card padding="lg">
            <CardHeader>
              <div>
                <CardTitle>Patient activity this week</CardTitle>
                <CardSubtitle>Visits recorded across all departments</CardSubtitle>
              </div>
              <Badge tone="teal">Last 7 days</Badge>
            </CardHeader>
            <CardBody>
              <ActivityChart data={chartData} />
            </CardBody>
          </Card>

          <Card padding="lg">
            <CardHeader>
              <div>
                <CardTitle>Recent appointments</CardTitle>
                <CardSubtitle>Today&apos;s schedule across all doctors</CardSubtitle>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate(ROUTES.appointments)}>
                View all
              </Button>
            </CardHeader>
            <CardBody>
              {appointments.isLoading && !appointments.data ? (
                <Loading />
              ) : (
                <Table
                  columns={appointmentColumns}
                  data={appointments.data?.content ?? []}
                  rowKey={(row) => row.id}
                  emptyMessage="No appointments booked yet."
                />
              )}
            </CardBody>
          </Card>

          <Card padding="lg">
            <CardHeader>
              <div>
                <CardTitle>Recent patients</CardTitle>
                <CardSubtitle>Newest records added to the system</CardSubtitle>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate(ROUTES.patients)}>
                View all
              </Button>
            </CardHeader>
            <CardBody>
              <ul className="mf-patient-list">
                {(patients.data?.content ?? []).map((patient) => (
                  <li key={patient.id} className="mf-patient-list__item">
                    <Avatar name={patient.fullName} size="sm" />
                    <div className="mf-patient-list__text">
                      <p className="mf-patient-list__name">{patient.fullName}</p>
                      <p className="mf-patient-list__meta">
                        {patient.patientCode}
                        {patient.bloodGroup ? ` · ${patient.bloodGroup}` : ''}
                      </p>
                    </div>
                    <span className="mf-patient-list__date">{formatDate(patient.createdAt)}</span>
                  </li>
                ))}
                {patients.data?.content.length === 0 && (
                  <li className="mf-patient-list__item">No patients registered yet.</li>
                )}
              </ul>
            </CardBody>
          </Card>
        </div>

        <div className="mf-dashboard__col mf-dashboard__col--side">
          <Card padding="lg">
            <CardTitle>Calendar</CardTitle>
            <div style={{ marginTop: 'var(--mf-space-4)' }}>
              <CalendarWidget />
            </div>
          </Card>

          <Card padding="lg">
            <CardTitle>Activity timeline</CardTitle>
            <div style={{ marginTop: 'var(--mf-space-5)' }}>
              <ActivityTimeline />
            </div>
          </Card>

          <Card padding="lg">
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              {summary.data && summary.data.unreadNotifications > 0 && (
                <Badge tone="coral">{summary.data.unreadNotifications} new</Badge>
              )}
            </CardHeader>
            <CardBody>
              <ul className="mf-notif-list">
                {(alerts.data?.content ?? []).map((alert) => (
                  <li key={alert.id}>
                    <strong>{alert.title}</strong>
                    <span>{alert.message}</span>
                  </li>
                ))}
                {alerts.data?.content.length === 0 && (
                  <li>
                    <strong>All clear</strong>
                    <span>No unread alerts right now.</span>
                  </li>
                )}
              </ul>
              <Link to={ROUTES.notifications} className="mf-dashboard__link">
                Open notification centre
              </Link>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
