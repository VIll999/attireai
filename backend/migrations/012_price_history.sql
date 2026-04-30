-- Sprint 3 Story #5: Sale notifications — track previous price for sale detection.
-- A simple two-snapshot approach: when a price drops, we keep the old price as
-- previous_price and stamp price_changed_at. The notification system fires off
-- this transition.

ALTER TABLE recommendation_items
  ADD COLUMN previous_price NUMERIC(10, 2) NULL,
  ADD COLUMN price_changed_at TIMESTAMP NULL;
