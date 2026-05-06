-- =====================================================
-- TRADING ACADEMY PLATFORM
-- INITIAL DATABASE SCHEMA
-- =====================================================

-- CORE SYSTEM
create schema if not exists core;

-- CRM SYSTEM
create schema if not exists crm;

-- EDUCATION PLATFORM
create schema if not exists academy;

-- CONTENT SYSTEM
create schema if not exists academy_content;

-- PAYMENTS SYSTEM
create schema if not exists payments;

-- AFFILIATE SYSTEM
create schema if not exists affiliates;

-- TRADING JOURNAL
create schema if not exists trading;

-- ANALYTICS
create schema if not exists analytics;

-- NOTIFICATIONS
create schema if not exists notifications;

-- SYSTEM INTERNAL
create schema if not exists system;

-- =====================================================
-- EXTENSIONS
-- =====================================================

create extension if not exists "uuid-ossp";

create extension if not exists pgcrypto;

-- =====================================================
-- BASIC ENUM TYPES
-- =====================================================

create type core.user_role as enum (
  'student',
  'trainer',
  'affiliate',
  'admin',
  'super_admin'
);

create type payments.subscription_status as enum (
  'active',
  'inactive',
  'cancelled',
  'past_due'
);

create type trading.trade_direction as enum (
  'buy',
  'sell'
);