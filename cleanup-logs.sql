-- Receipt Logs Cleanup SQL Commands

-- Emergency cleanup - Delete logs older than 14 days
DELETE FROM receipt_logs WHERE created_at < NOW() - INTERVAL '14 days';

-- Check how many records will be deleted (run first to be safe)
-- SELECT COUNT(*) as total_logs FROM receipt_logs;
-- SELECT COUNT(*) as old_logs FROM receipt_logs WHERE created_at < NOW() - INTERVAL '14 days';

-- More conservative cleanup - Keep 30 days
-- DELETE FROM receipt_logs WHERE created_at < NOW() - INTERVAL '30 days';

-- Aggressive cleanup - Keep only 3 days (emergency only)
-- DELETE FROM receipt_logs WHERE created_at < NOW() - INTERVAL '3 days';

-- View recent logs by status (for debugging)
-- SELECT 
--   processing_status,
--   COUNT(*) as count,
--   MAX(created_at) as latest
-- FROM receipt_logs 
-- WHERE created_at > NOW() - INTERVAL '1 hour'
-- GROUP BY processing_status;

-- Find users with most logs (identify problem users)
-- SELECT 
--   user_id,
--   COUNT(*) as log_count,
--   MAX(created_at) as latest_log
-- FROM receipt_logs 
-- WHERE created_at > NOW() - INTERVAL '1 day'
-- GROUP BY user_id
-- ORDER BY log_count DESC
-- LIMIT 10;