function formatPkMoney(value) {
  const n = Number(value) || 0
  return n.toLocaleString('en-PK', { maximumFractionDigits: 0 })
}

/** True when deposit is settled and the UI should show log/record (not refund form). */
export function isSecurityDepositRecordView(securitySummary) {
  if (!securitySummary) return false
  const held = Number(securitySummary?.heldAmount ?? securitySummary?.HeldAmount ?? 0)
  const hasRefund = Boolean(
    securitySummary?.hasRefundHistory ?? securitySummary?.HasRefundHistory,
  )
  return hasRefund && held <= 0
}

/** Row action menu / ellipsis label for security deposit. */
export function getSecurityDepositActionLabel(securitySummary, loading = false) {
  if (loading) return 'Security deposit'
  if (isSecurityDepositRecordView(securitySummary)) return 'Security deposit record'
  return 'Refund security deposit'
}

/** Staff-facing security deposit line for profile screen and print. */
export function getSecurityDepositProfileInfo(securitySummary, admissionDetail) {
  const held = Number(securitySummary?.heldAmount ?? securitySummary?.HeldAmount ?? 0)
  const refunded = Number(securitySummary?.totalRefunded ?? securitySummary?.TotalRefunded ?? 0)
  const hasRefund = Boolean(securitySummary?.hasRefundHistory ?? securitySummary?.HasRefundHistory)
  const netDeposited = Number(securitySummary?.netDeposited ?? securitySummary?.NetDeposited ?? 0)
  const chargeAmount = Number(
    admissionDetail?.securityDeposit ?? admissionDetail?.SecurityDeposit ?? 0,
  )

  if (held > 0) {
    return {
      held,
      refunded,
      chargeAmount,
      statusLabel: 'Held with school',
      statusDetail: `Rs ${formatPkMoney(held)} available to refund when the student leaves.`,
      tone: 'held',
    }
  }

  if (hasRefund && refunded > 0) {
    return {
      held,
      refunded,
      chargeAmount,
      statusLabel: 'Refunded',
      statusDetail: `Rs ${formatPkMoney(refunded)} was returned to the family.`,
      tone: 'refunded',
    }
  }

  if (chargeAmount > 0 || netDeposited > 0) {
    const chargeText = chargeAmount > 0 ? `Rs ${formatPkMoney(chargeAmount)}` : '—'
    return {
      held,
      refunded,
      chargeAmount,
      statusLabel: 'Not collected yet',
      statusDetail:
        chargeAmount > 0
          ? `${chargeText} is on the fee account but has not been received.`
          : 'Deposit was adjusted; nothing is held now.',
      tone: 'pending',
    }
  }

  return {
    held: 0,
    refunded: 0,
    chargeAmount: 0,
    statusLabel: 'No deposit',
    statusDetail: 'No security deposit has been recorded for this student.',
    tone: 'none',
  }
}
