/**
 * VerificationService
 * 
 * ا
 *  total = vendor + commission
 */

class VerificationService {
  constructor(db) {
    this.db = db;
  }

  /**
   * Verify BI integrity
   *   */
  async verifyBIIntegrity() {
    const issues = [];

    // 1️⃣ Check: All orders have payments recorded
    const [[unrecordedOrders]] = await this.db.execute(`
      SELECT COUNT(*) as count FROM orders o
      WHERE o.payment_status = 'paid'
      AND NOT EXISTS (
        SELECT 1 FROM financial_transactions ft
        WHERE ft.order_id = o.id AND ft.type = 'order_payment'
      )
    `);

    if (unrecordedOrders.count > 0) {
      issues.push(`⚠️  ${unrecordedOrders.count} orders paid but no financial transaction recorded`);
    }

    // 2️⃣ Check: Payment amounts match
    const mismatchedPayments = await this.db.execute(`
      SELECT o.id, o.total, ft.amount
      FROM orders o
      JOIN financial_transactions ft ON o.id = ft.order_id
      WHERE ft.type = 'order_payment'
      AND ABS(o.total - ft.amount) > 0.01
    `);

    if (mismatchedPayments[0].length > 0) {
      issues.push(`⚠️  ${mismatchedPayments[0].length} orders with mismatched payment amounts`);
    }

    // 3️⃣ Check: Commission + vendor = total
    const commissionMismatches = await this.db.execute(`
      SELECT o.id, o.total, o.admin_commission, o.vendor_amount,
             (o.admin_commission + o.vendor_amount) as sum_total
      FROM orders o
      WHERE o.payment_status = 'paid'
      AND ABS(o.total - (o.admin_commission + o.vendor_amount)) > 0.01
    `);

    if (commissionMismatches[0].length > 0) {
      issues.push(`⚠️  ${commissionMismatches[0].length} orders with commission mismatch`);
    }

    // 4️⃣ Check: Wallet balance = sum of vendor amounts
    const walletMismatches = await this.db.execute(`
      SELECT s.id, s.name, s.wallet_balance,
             SUM(CASE WHEN ft.type = 'order_payment' THEN ft.vendor_amount 
                      WHEN ft.type = 'vendor_payout' THEN -ft.vendor_amount
                      ELSE 0 END) as calculated_balance
      FROM stores s
      LEFT JOIN financial_transactions ft ON s.id = ft.store_id
      GROUP BY s.id
      HAVING ABS(s.wallet_balance - COALESCE(calculated_balance, 0)) > 0.01
    `);

    if (walletMismatches[0].length > 0) {
      issues.push(`⚠️  ${walletMismatches[0].length} stores with wallet balance mismatch`);
    }

    return {
      isValid: issues.length === 0,
      issues,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Generate BI health report
   * 
   */
  async generateHealthReport() {
    const integrity = await this.verifyBIIntegrity();

    const [[stats]] = await this.db.execute(`
      SELECT
        COUNT(DISTINCT o.id) as total_orders,
        SUM(CASE WHEN o.payment_status = 'paid' THEN 1 ELSE 0 END) as paid_orders,
        SUM(o.total) as total_revenue,
        COUNT(DISTINCT ft.id) as total_transactions,
        COUNT(DISTINCT s.id) as total_stores,
        SUM(s.wallet_balance) as total_wallet_balance
      FROM orders o
      LEFT JOIN financial_transactions ft ON o.id = ft.order_id
      LEFT JOIN stores s ON o.store_id = s.id
    `);

    const report = {
      integrity,
      statistics: stats,
      timestamp: new Date().toISOString()
    };

    await this.logVerification(report);
    await this.logAuditReport(report);

    return report;
  }

  /**
   * Log verification result
   *    */
  async logVerification(report) {
    await this.db.execute(`
      INSERT INTO bi_verification_log (report, is_valid, created_at)
      VALUES (?, ?, NOW())
    `, [JSON.stringify(report), report.integrity.isValid ? 1 : 0]);
  }

  /**
   * Log BI audit row for integrity issues or successful check
   */
  async logAuditReport(report, connection = null) {
    const dbClient = connection || this.db;
    const action = report.integrity.isValid ? 'bi_integrity_check_passed' : 'bi_integrity_check_failed';
    const details = {
      issues: report.integrity.issues,
      statistics: report.statistics,
      timestamp: report.timestamp
    };

    await dbClient.execute(`
      INSERT INTO bi_audit_log (transaction_id, action, details, created_at)
      VALUES (NULL, ?, ?, NOW())
    `, [action, JSON.stringify(details)]);
  }
}

module.exports = VerificationService;
