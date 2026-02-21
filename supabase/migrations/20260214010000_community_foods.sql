-- ============================================================================
-- FuelIQ Community Foods Migration
-- Date: 2026-02-14
-- Purpose: Create tables for user-contributed food database, allowing users
--          to submit, vote on, and report community foods. Includes RLS
--          policies, indexes, triggers for vote counting, and auto-approval.
-- ============================================================================

-- ============================================================================
-- PART 1: TABLE CREATION
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. community_foods
-- User-submitted foods shared with the community. Each food goes through a
-- moderation pipeline: pending -> approved/rejected. Foods with sufficient
-- positive votes can be auto-approved.
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS community_foods (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    name            text        NOT NULL,
    brand           text,
    barcode         text,
    calories        integer     NOT NULL DEFAULT 0,
    protein         real        NOT NULL DEFAULT 0,
    carbs           real        NOT NULL DEFAULT 0,
    fat             real        NOT NULL DEFAULT 0,
    fiber           real        NOT NULL DEFAULT 0,
    sugar           real        NOT NULL DEFAULT 0,
    sodium          real        NOT NULL DEFAULT 0,
    serving_size    real        NOT NULL DEFAULT 1,
    serving_unit    text        NOT NULL DEFAULT 'serving',
    category        text        NOT NULL DEFAULT 'other',
    submitted_by    uuid        NOT NULL REFERENCES auth.users ON DELETE CASCADE,
    status          text        NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending', 'approved', 'rejected')),
    upvotes         integer     NOT NULL DEFAULT 0,
    downvotes       integer     NOT NULL DEFAULT 0,
    verified        boolean     NOT NULL DEFAULT false,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 2. community_food_votes
-- Tracks upvotes and downvotes on community foods. Each user can only vote
-- once per food (UNIQUE constraint). vote_type is either 'up' or 'down'.
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS community_food_votes (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    food_id         uuid        NOT NULL REFERENCES community_foods ON DELETE CASCADE,
    user_id         uuid        NOT NULL REFERENCES auth.users ON DELETE CASCADE,
    vote_type       text        NOT NULL CHECK (vote_type IN ('up', 'down')),
    created_at      timestamptz NOT NULL DEFAULT now(),
    UNIQUE (food_id, user_id)
);

-- --------------------------------------------------------------------------
-- 3. community_food_reports
-- Users can report foods for inaccuracy, spam, or other reasons.
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS community_food_reports (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    food_id         uuid        NOT NULL REFERENCES community_foods ON DELETE CASCADE,
    reporter_id     uuid        NOT NULL REFERENCES auth.users ON DELETE CASCADE,
    reason          text        NOT NULL,
    created_at      timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- PART 2: INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_community_foods_name
    ON community_foods USING gin (to_tsvector('english', name));

CREATE INDEX IF NOT EXISTS idx_community_foods_barcode
    ON community_foods (barcode)
    WHERE barcode IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_community_foods_category
    ON community_foods (category);

CREATE INDEX IF NOT EXISTS idx_community_foods_submitted_by
    ON community_foods (submitted_by);

CREATE INDEX IF NOT EXISTS idx_community_foods_status
    ON community_foods (status);

CREATE INDEX IF NOT EXISTS idx_community_foods_status_name
    ON community_foods (status, name);

CREATE INDEX IF NOT EXISTS idx_community_food_votes_food_id
    ON community_food_votes (food_id);

CREATE INDEX IF NOT EXISTS idx_community_food_votes_user_id
    ON community_food_votes (user_id);

CREATE INDEX IF NOT EXISTS idx_community_food_reports_food_id
    ON community_food_reports (food_id);

-- ============================================================================
-- PART 3: TRIGGER FUNCTIONS
-- ============================================================================

-- --------------------------------------------------------------------------
-- update_food_vote_counts()
-- Recalculates upvote and downvote counts on community_foods whenever a
-- vote is inserted, updated, or deleted.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_food_vote_counts()
RETURNS TRIGGER AS $$
DECLARE
    target_food_id uuid;
BEGIN
    -- Determine which food_id to update
    IF TG_OP = 'DELETE' THEN
        target_food_id := OLD.food_id;
    ELSE
        target_food_id := NEW.food_id;
    END IF;

    -- Recalculate counts from scratch (safe against race conditions)
    UPDATE community_foods
    SET
        upvotes   = COALESCE((SELECT COUNT(*) FROM community_food_votes WHERE food_id = target_food_id AND vote_type = 'up'), 0),
        downvotes = COALESCE((SELECT COUNT(*) FROM community_food_votes WHERE food_id = target_food_id AND vote_type = 'down'), 0),
        updated_at = now()
    WHERE id = target_food_id;

    -- Also handle the OLD food_id on UPDATE if food_id changed
    IF TG_OP = 'UPDATE' AND OLD.food_id != NEW.food_id THEN
        UPDATE community_foods
        SET
            upvotes   = COALESCE((SELECT COUNT(*) FROM community_food_votes WHERE food_id = OLD.food_id AND vote_type = 'up'), 0),
            downvotes = COALESCE((SELECT COUNT(*) FROM community_food_votes WHERE food_id = OLD.food_id AND vote_type = 'down'), 0),
            updated_at = now()
        WHERE id = OLD.food_id;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_community_food_votes_count
    AFTER INSERT OR UPDATE OR DELETE ON community_food_votes
    FOR EACH ROW
    EXECUTE FUNCTION update_food_vote_counts();

-- --------------------------------------------------------------------------
-- auto_approve_community_food()
-- Automatically sets status = 'approved' when a food reaches 5+ upvotes
-- and 0 downvotes. Runs after community_foods is updated (by the vote
-- count trigger above).
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION auto_approve_community_food()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'pending'
       AND NEW.upvotes >= 5
       AND NEW.downvotes = 0 THEN
        NEW.status := 'approved';
        NEW.updated_at := now();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_community_food_auto_approve
    BEFORE UPDATE ON community_foods
    FOR EACH ROW
    EXECUTE FUNCTION auto_approve_community_food();

-- --------------------------------------------------------------------------
-- update_community_foods_updated_at()
-- Standard updated_at timestamp trigger.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_community_foods_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_community_foods_updated_at
    BEFORE UPDATE ON community_foods
    FOR EACH ROW
    EXECUTE FUNCTION update_community_foods_updated_at();

-- ============================================================================
-- PART 4: ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE community_foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_food_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_food_reports ENABLE ROW LEVEL SECURITY;

-- --------------------------------------------------------------------------
-- community_foods policies
-- --------------------------------------------------------------------------

-- Anyone can read approved foods
CREATE POLICY community_foods_select_approved
    ON community_foods FOR SELECT
    USING (status = 'approved');

-- Authenticated users can also read their own pending/rejected submissions
CREATE POLICY community_foods_select_own
    ON community_foods FOR SELECT
    TO authenticated
    USING (submitted_by = auth.uid());

-- Authenticated users can submit new foods
CREATE POLICY community_foods_insert
    ON community_foods FOR INSERT
    TO authenticated
    WITH CHECK (submitted_by = auth.uid());

-- Users can only update their own pending submissions
CREATE POLICY community_foods_update_own
    ON community_foods FOR UPDATE
    TO authenticated
    USING (submitted_by = auth.uid() AND status = 'pending')
    WITH CHECK (submitted_by = auth.uid() AND status = 'pending');

-- Users can delete their own pending submissions
CREATE POLICY community_foods_delete_own
    ON community_foods FOR DELETE
    TO authenticated
    USING (submitted_by = auth.uid() AND status = 'pending');

-- --------------------------------------------------------------------------
-- community_food_votes policies
-- --------------------------------------------------------------------------

-- Anyone authenticated can read votes
CREATE POLICY community_food_votes_select
    ON community_food_votes FOR SELECT
    TO authenticated
    USING (true);

-- Authenticated users can insert votes (for themselves only)
CREATE POLICY community_food_votes_insert
    ON community_food_votes FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Users can update their own votes (change up->down or vice versa)
CREATE POLICY community_food_votes_update
    ON community_food_votes FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Users can delete their own votes (un-vote)
CREATE POLICY community_food_votes_delete
    ON community_food_votes FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- --------------------------------------------------------------------------
-- community_food_reports policies
-- --------------------------------------------------------------------------

-- Authenticated users can insert reports
CREATE POLICY community_food_reports_insert
    ON community_food_reports FOR INSERT
    TO authenticated
    WITH CHECK (reporter_id = auth.uid());

-- Users can read their own reports
CREATE POLICY community_food_reports_select_own
    ON community_food_reports FOR SELECT
    TO authenticated
    USING (reporter_id = auth.uid());
