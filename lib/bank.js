/* Bank transfer details, from settings (.env.local locally, Vercel environment variables when live). */
const e = k => process.env[k] || '';

export function bankInfo() {
  return { bank: e('BANK_NAME') || 'Scotiabank', accountName: e('BANK_ACCOUNT_NAME'), accountNumber: e('BANK_ACCOUNT_NUMBER'), accountType: e('BANK_ACCOUNT_TYPE'), branch: e('BANK_BRANCH') };
}
export function bankText() {
  const b = bankInfo();
  if (!b.accountNumber) return 'Shen will send you the bank account details on WhatsApp.';
  return `Bank: ${b.bank}\nAccount name: ${b.accountName}\nAccount number: ${b.accountNumber}${b.accountType ? `\nAccount type: ${b.accountType}` : ''}${b.branch ? `\nBranch: ${b.branch}` : ''}`;
}
