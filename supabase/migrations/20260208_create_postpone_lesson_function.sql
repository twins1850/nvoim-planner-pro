CREATE OR REPLACE FUNCTION postpone_lesson(
    p_lesson_id UUID,
    p_reason postponement_reason,
    p_reason_detail TEXT DEFAULT NULL,
    p_rescheduled_date DATE DEFAULT NULL,
    p_rescheduled_time TIME DEFAULT NULL
)
RETURNS json AS $$
DECLARE
    v_lesson public.lessons%ROWTYPE;
    v_subscription public.subscriptions%ROWTYPE;
    v_current_user_id UUID;
    v_postponement_id UUID;
BEGIN
    v_current_user_id := auth.uid();

    SELECT * INTO v_lesson
    FROM public.lessons
    WHERE id = p_lesson_id;

    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Lesson not found'
        );
    END IF;

    SELECT * INTO v_subscription
    FROM public.subscriptions
    WHERE id = v_lesson.subscription_id;

    IF v_subscription.postponements_used >= v_subscription.max_postponements THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Maximum postponements exceeded'
        );
    END IF;

    UPDATE public.lessons
    SET status = 'postponed',
        updated_at = NOW()
    WHERE id = p_lesson_id;

    INSERT INTO public.postponements (
        lesson_id,
        subscription_id,
        original_date,
        original_start_time,
        rescheduled_date,
        rescheduled_start_time,
        reason,
        reason_detail,
        requested_by
    ) VALUES (
        p_lesson_id,
        v_lesson.subscription_id,
        v_lesson.scheduled_date,
        v_lesson.scheduled_start_time,
        p_rescheduled_date,
        p_rescheduled_time,
        p_reason,
        p_reason_detail,
        v_current_user_id
    ) RETURNING id INTO v_postponement_id;

    UPDATE public.subscriptions
    SET postponements_used = postponements_used + 1,
        updated_at = NOW()
    WHERE id = v_lesson.subscription_id;

    RETURN json_build_object(
        'success', true,
        'postponement_id', v_postponement_id,
        'postponements_remaining', v_subscription.max_postponements - v_subscription.postponements_used - 1
    );

EXCEPTION
    WHEN others THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Failed to postpone lesson: ' || SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
