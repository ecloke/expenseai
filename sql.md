## delete receipt logs > 14 days
DELETE FROM receipt_logs WHERE created_at < NOW() - INTERVAL '14 days';