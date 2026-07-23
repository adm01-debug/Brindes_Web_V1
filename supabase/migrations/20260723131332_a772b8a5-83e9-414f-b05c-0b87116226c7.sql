
REVOKE EXECUTE ON FUNCTION public.notify_new_lead() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_new_question() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_question_answered() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_new_review() FROM PUBLIC, anon, authenticated;
