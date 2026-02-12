-- CreateIndex
CREATE INDEX "attendance_libraryId_branchId_checkIn_idx" ON "attendance"("libraryId", "branchId", "checkIn");

-- CreateIndex
CREATE INDEX "payments_libraryId_status_date_idx" ON "payments"("libraryId", "status", "date");

-- CreateIndex
CREATE INDEX "payments_libraryId_status_date_method_idx" ON "payments"("libraryId", "status", "date", "method");

-- CreateIndex
CREATE INDEX "student_subscriptions_libraryId_branchId_status_endDate_idx" ON "student_subscriptions"("libraryId", "branchId", "status", "endDate");
