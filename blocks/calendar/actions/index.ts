// blocks/calendar/actions/index.ts

// ─── Check Availability ──────────────────────────────────────────────────────
export { 
  checkAvailability,
  type BusyInterval,
  type CheckAvailabilityResult,
} from './check-availability'

// ─── Create Appointment ──────────────────────────────────────────────────────
export { 
  createAppointment,
  createManualAppointment,
  type CreateAppointmentPayload,
  type CreateAppointmentResult,
} from './create-appointment'

// ─── Approve Appointment ─────────────────────────────────────────────────────
export { 
  approveAppointment,
  type ApproveAppointmentResult,
} from './approve-appointment'

// ─── Mark Paid ───────────────────────────────────────────────────────────────
export { 
  markDepositPaid,
  type MarkPaidResult,
} from './mark-paid'

// ─── Cancel Appointment ──────────────────────────────────────────────────────
export { 
  cancelAppointment,
  type CancelAppointmentResult,
} from './cancel-appointment'

// ─── Reschedule Appointment ──────────────────────────────────────────────────
export { 
  rescheduleAppointment,
  type RescheduleAppointmentResult,
} from './reschedule-appointment'

// ─── Block Time ──────────────────────────────────────────────────────────────
export { 
  blockTime,
  unblockTime,
  type BlockTimePayload,
  type BlockTimeResult,
} from './block-time'