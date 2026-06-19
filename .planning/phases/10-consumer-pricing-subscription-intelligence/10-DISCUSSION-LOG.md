# Phase 10 Discussion Log

**Date:** 2026-06-19
**Phase:** Consumer Pricing & Subscription Intelligence

## Area 1: Nguồn crawl

**Question:** Nên crawl những nguồn nào cho consumer pricing?
**Options:** 2 nguồn trước / 5 nguồn chính / Mở rộng tối đa
**Selection:** Mở rộng tối đa (10+ providers)
**Notes:** ChatGPT, Gemini, Claude, Perplexity, Copilot, Poe, Grok, You.com, Phind, Cursor

## Area 2: Schema design

**Question:** Schema design cho subscription plans — tạo bảng mới hay mở rộng bảng cũ?
**Options:** Bảng riêng subscription_plans / Mở rộng bảng promotions
**Selection:** Bảng riêng subscription_plans
**Notes:** Rõ ràng, dễ query, không lẫn với API pricing. Unique constraint trên (source_id, plan_name)

## Area 3: Display integration

**Question:** Hiển thị subscription plans ở đâu?
**Options:** Trang riêng /subscriptions / Tích hợp vào /promotions / Cả hai
**Selection:** Trang riêng /subscriptions
**Notes:** Card grid layout, filter pills, sort by price. Thêm nav link vào TopNav

## Area 4: Free trial tracking

**Question:** Free trial tracking ở mức nào?
**Options:** Metadata only / Metadata + user tracking
**Selection:** Metadata only
**Notes:** Capture duration, conditions. Hiển thị badge trên cards. Không track user state

## Deferred Ideas

- Price comparison giữa API và consumer plans
- Historical subscription price tracking
- User trial tracking với expiry notifications
- Side-by-side subscription plan comparison tool
