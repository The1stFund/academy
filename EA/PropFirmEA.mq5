//+------------------------------------------------------------------+
//|                                            PropFirmEA.mq5        |
//|       Conservative EA for FTMO / The5ers / Funded Accounts       |
//|                                                                  |
//|  Strategies:                                                     |
//|   A) Trend Pullback     – EMA zone re-entry in trending market   |
//|   B) Volatility Breakout– confirmed range breakout + momentum    |
//|   C) Mean Reversion     – range extreme rejection (optional)     |
//|                                                                  |
//|  ─── PROP-FIRM COMPLIANCE ASSUMPTIONS ───────────────────────── |
//|  • Risk calculated on equity (incl. floating P&L) — FTMO-style  |
//|  • Soft daily limit → blocks new entries, holds existing trades  |
//|  • Hard daily limit → immediate day lock, full alert             |
//|  • Absolute max loss → EA-level kill-switch since first run      |
//|  • SL + TP ALWAYS set at order open — no naked positions         |
//|  • No averaging, no grid, no martingale, no hedging              |
//|  • Preset system overrides risk params by account size           |
//|  • Per-symbol daily trade cap (MaxTradesPerSymbolPerDay)         |
//|  • Max open risk % across all positions simultaneously           |
//|  • Correlated directional exposure cap (max % in one direction)  |
//|  • News blackout via MQL5 Economic Calendar (high-impact only)   |
//|  • Rollover window filter (configurable server-time block)       |
//|  • London / New York / Asia session selection                    |
//|  • All entry decisions bar-close-based — no tick scalping        |
//|  • Magic number isolates EA orders from manual trades            |
//|                                                                  |
//|  ─── TESTING CHECKLIST ──────────────────────────────────────── |
//|  □ Apply each preset, verify effective params logged correctly   |
//|  □ Backtest EURUSD H1 2020–2024 Every Tick w/ real spread        |
//|  □ Backtest XAUUSD H1 (Gold) — verify lot sizing via equity      |
//|  □ Backtest NAS100 / US30 — verify index spread ATR filter       |
//|  □ Verify soft limit blocks entries but holds open positions      |
//|  □ Verify hard limit fires on equity drop, not just closed P&L   |
//|  □ Verify absolute max loss kills all new entries                |
//|  □ Confirm SL/TP always set (never 0,0 in log or trade history)  |
//|  □ Confirm no trade during rollover window                       |
//|  □ Confirm news filter blocks entries 45 min before high-impact  |
//|  □ Verify per-symbol cap (MaxTradesPerSymbolPerDay = 1)          |
//|  □ Verify open risk % cap respected with multiple positions       |
//|  □ Walk-forward: IS 2020–2022 / OOS 2023–2024                    |
//|  □ Monte Carlo: min 1000 runs, max ruin probability < 1%         |
//|  □ Demo run 2 weeks before live prop challenge                   |
//+------------------------------------------------------------------+
#property copyright   "© 2024 Professional MQL5 Developer"
#property version     "2.00"
#property description "Prop-Firm EA v2 — Preset risk system, equity-based sizing."
#property description "Soft/Hard daily limits, open risk cap, correlated exposure cap."

#include <Trade\Trade.mqh>
#include <Trade\PositionInfo.mqh>
#include <Trade\SymbolInfo.mqh>

//╔══════════════════════════════════════════════════════════════════╗
//║  ENUMERATIONS                                                    ║
//╚══════════════════════════════════════════════════════════════════╝

enum ENUM_MARKET_REGIME
{
   REGIME_TREND_UP   = 1,   // Uptrend   (EMA fast>slow, ADX>=threshold)
   REGIME_TREND_DOWN = 2,   // Downtrend (EMA fast<slow, ADX>=threshold)
   REGIME_RANGE      = 3,   // Sideways  (ADX<=threshold)
   REGIME_UNDEFINED  = 0    // Ambiguous — no entry allowed
};

// ── Prop-firm account size presets ──────────────────────────────────
enum ENUM_PROP_PRESET
{
   PRESET_CUSTOM      = 0,  // Custom (use manual input values below)
   PRESET_SMALL_1K    = 1,  // Small  $1,000  challenge
   PRESET_SMALL_5K    = 2,  // Small  $5,000  challenge
   PRESET_MEDIUM_10K  = 3,  // Medium $10,000 challenge
   PRESET_LARGE_50K   = 4,  // Large  $50,000 challenge
   PRESET_XL_100K     = 5   // XL    $100,000 challenge
};

enum ENUM_TP_MODE
{
   TP_FIXED_RR    = 0,   // Fixed R:R at open
   TP_SWING_TRAIL = 1    // No fixed TP — trail only
};

//╔══════════════════════════════════════════════════════════════════╗
//║  STRUCTURES                                                      ║
//╚══════════════════════════════════════════════════════════════════╝

struct STradeSetup
{
   string           symbol;
   ENUM_ORDER_TYPE  orderType;
   double           entryPrice;
   double           stopLoss;
   double           takeProfit;
   double           lotSize;
   double           riskAmount;
   string           strategy;     // Label for logging
   string           reason;
   bool             valid;

   STradeSetup() : valid(false), lotSize(0.0), riskAmount(0.0),
                   entryPrice(0.0), stopLoss(0.0), takeProfit(0.0) {}
};

struct SDailyStats
{
   datetime  date;
   double    startingBalance;    // Balance at session open
   double    startingEquity;     // Equity at session open (for equity-DD calc)
   double    realizedPnL;        // Closed P&L today (profit+swap+comm)
   int       tradesOpened;       // New positions opened (DEAL_ENTRY_IN)
   int       consecutiveLosses;  // Losses since last win
   bool      softLocked;         // Soft limit hit — no new entries
   bool      hardLocked;         // Hard limit hit — emergency lock
   bool      dayLocked;          // Union: softLocked OR hardLocked

   SDailyStats() : tradesOpened(0), consecutiveLosses(0), realizedPnL(0.0),
                   softLocked(false), hardLocked(false), dayLocked(false),
                   startingBalance(0.0), startingEquity(0.0), date(0) {}
};

struct SWeeklyStats
{
   datetime  weekStart;
   double    startingBalance;
   double    realizedPnL;
   bool      weekLocked;

   SWeeklyStats() : realizedPnL(0.0), weekLocked(false),
                    startingBalance(0.0), weekStart(0) {}
};

// Per-symbol intraday trade counter
struct SSymbolDayStats
{
   string   symbol;
   datetime date;
   int      tradesOpened;
};

//╔══════════════════════════════════════════════════════════════════╗
//║  INPUT PARAMETERS                                                ║
//╚══════════════════════════════════════════════════════════════════╝

//─── 0. PRESET & TIMEFRAME ──────────────────────────────────────────
input group "══ PRESET & TIMEFRAME ══"
input ENUM_PROP_PRESET InpPreset         = PRESET_CUSTOM;  // Account Size Preset (overrides risk section)
input ENUM_TIMEFRAMES  InpRegimeTF       = PERIOD_H1;      // Analysis Timeframe
input ENUM_TP_MODE     InpTPMode         = TP_FIXED_RR;    // Take-Profit Mode

//─── 1. GLOBAL RISK INPUTS ──────────────────────────────────────────
input group "══ GLOBAL RISK INPUTS ══"
input double RiskPerTradePercent            = 0.50;   // Risk per trade (% of sizing base)
input double DailyLossSoftLimitPercent      = 2.00;   // Soft daily loss limit % — blocks new entries
input double DailyLossHardLimitPercent      = 3.50;   // Hard daily loss limit % — emergency lock
input double AbsoluteMaxLossPercent         = 8.50;   // Absolute max loss % (since EA start)
input int    MaxLosingTradesPerDay          = 2;      // Max losses/day before day-lock
input int    MaxTradesPerDay                = 3;      // Max new trades per day
input double MaxOpenRiskPercent             = 1.00;   // Max total open risk % (all positions SL-risk)
input double MaxCorrelatedExposurePercent   = 1.00;   // Max directional exposure % (long OR short)
input bool   UseEquityBasedSizing           = true;   // Size on equity (captures floating losses)
input bool   UseBalanceCapForSizing         = true;   // Cap sizing base at balance (prevent over-lot)

//─── 2. EXECUTION FILTERS ───────────────────────────────────────────
input group "══ EXECUTION FILTERS ══"
input double MaxSpreadPoints                = 0;      // Max spread in broker points (0 = disabled)
input double MaxSpreadAsATRPercent          = 12.0;   // Max spread as % of ATR (12% recommended)
input bool   EnableNewsFilter               = true;   // Block high-impact economic news
input int    NewsBlockMinutesBefore         = 45;     // Block N min BEFORE news release
input int    NewsBlockMinutesAfter          = 20;     // Block N min AFTER  news release
input bool   BlockTradingNearRollover       = true;   // Block trading near daily rollover
input int    RolloverServerHour             = 22;     // Server rollover hour (broker-specific)
input int    RolloverBlockMinutesBefore     = 30;     // Block N min before rollover
input int    RolloverBlockMinutesAfter      = 15;     // Block N min after  rollover

//─── 3. STRATEGY FILTERS ────────────────────────────────────────────
input group "══ STRATEGY FILTERS ══"
input int    EMAFast                        = 50;     // Fast EMA period (trend direction)
input int    EMASlow                        = 200;    // Slow EMA period (major trend)
input int    PullbackEMA                    = 20;     // Pullback EMA period (entry reference)
input int    ATRPeriod                      = 14;     // ATR period (volatility baseline)
input double ATR_SL_Multiplier              = 1.5;    // SL distance in ATR multiples
input double RR_Target                      = 2.0;    // Risk:Reward for all strategies
input double BreakEvenAtR                   = 1.0;    // Move SL to BE after N × R profit
input double TrailStartAtR                  = 1.5;    // Start trailing after N × R profit
input bool   EnableTrendPullback            = true;   // Enable Strategy A: Trend Pullback
input bool   EnableBreakout                 = true;   // Enable Strategy B: Volatility Breakout
input bool   EnableMeanReversion            = false;  // Enable Strategy C: Mean Reversion
input int    ADXPeriod                      = 14;     // ADX period
input double ADXTrendMin                    = 22.0;   // ADX ≥ this → TREND regime
input double ADXRangeMax                    = 18.0;   // ADX ≤ this → RANGE regime

//─── 4. SESSION FILTERS ─────────────────────────────────────────────
input group "══ SESSION FILTERS ══"
input bool   TradeLondon                    = true;   // Allow entries in London session  (07-16 GMT)
input bool   TradeNewYork                   = true;   // Allow entries in New York session (13-22 GMT)
input bool   TradeAsia                      = false;  // Allow entries in Asia session     (23-08 GMT)
input int    MaxTradesPerSymbolPerDay       = 1;      // Max new trades per symbol per day
input int    GMTOffsetHours                 = 0;      // Server time offset from GMT (e.g., +2 for EET)
input bool   BlockFridayClose               = true;   // Block entries on Friday after hour:
input int    FridayBlockHour                = 20;     // Friday block hour (server time)
input bool   BlockMondayOpen                = true;   // Block entries Monday first N minutes
input int    MondayBlockMinutes             = 30;     // Monday open block (minutes, server time)

//─── 5. IDENTITY ────────────────────────────────────────────────────
input group "══ IDENTITY ══"
input long   InpMagicNumber                 = 20241201;       // Magic Number
input string InpEAComment                   = "PropFirmEA";  // Order Comment

//─── 6. TRAILING & EXIT ─────────────────────────────────────────────
input group "══ TRAILING & EXIT ══"
input bool   InpTrailingEnable              = true;   // Enable Trailing Stop
input double InpTrailingATRMult             = 2.0;    // Trailing distance (× ATR)
input double InpTrailingMinStep             = 0.3;    // Min SL improvement before modifying (× ATR)
input bool   InpPartialCloseEnable          = false;  // Partial close 50% at 1R
input double InpPartialCloseRatio           = 0.50;   // Partial close fraction

//─── 7. ADVANCED STRATEGY ───────────────────────────────────────────
input group "══ ADVANCED STRATEGY ══"
input int    InpSwingLookback               = 10;     // Swing H/L lookback for SL placement (bars)
input int    InpBoxPeriod                   = 20;     // Breakout box period (bars)
input double InpBreakoutATRMin              = 0.5;    // Min breakout magnitude (× ATR)
input int    InpRangePeriod                 = 30;     // Mean-reversion range period (bars)
input double InpEdgeEntryATR                = 0.2;    // Edge buffer from range boundary (× ATR)

//─── 8. LOGGING ─────────────────────────────────────────────────────
input group "══ LOGGING ══"
input bool   InpLogToFile                   = true;   // Write log to terminal Files folder
input bool   InpLogRejections               = true;   // Log all setup rejection reasons
input int    InpLogLevel                    = 2;      // 0=off 1=errors 2=info 3=debug

//╔══════════════════════════════════════════════════════════════════╗
//║  GLOBAL STATE                                                    ║
//╚══════════════════════════════════════════════════════════════════╝

CTrade       g_trade;
SDailyStats  g_daily;
SWeeklyStats g_weekly;

// ── Effective risk parameters (set from preset in OnInit, else from inputs) ──
double g_effRiskPct;           // Risk % per trade
double g_effSoftLimitPct;      // Soft daily loss limit %
double g_effHardLimitPct;      // Hard daily loss limit %
double g_effAbsMaxLossPct;     // Absolute max loss % (since EA start)
double g_effMaxOpenRiskPct;    // Max total open risk %
int    g_effMaxDailyTrades;    // Max trades per day
int    g_effMaxLosingTrades;   // Max losing trades per day

// ── Absolute drawdown reference (set once at OnInit, persists) ──────
double g_absStartBalance;      // Balance at EA initialization

// ── Indicator handles ────────────────────────────────────────────────
int g_hEMAFast  = INVALID_HANDLE;
int g_hEMASlow  = INVALID_HANDLE;
int g_hEMAPull  = INVALID_HANDLE;   // Pullback EMA (faster reference)
int g_hADX      = INVALID_HANDLE;
int g_hATR      = INVALID_HANDLE;

// ── Per-symbol daily stats ───────────────────────────────────────────
SSymbolDayStats g_symStats[];

// ── Misc ─────────────────────────────────────────────────────────────
datetime g_lastBarTime  = 0;
ulong    g_partialTickets[];
int      g_logFile      = INVALID_HANDLE;
string   g_symbol;
int      g_digits;
double   g_point;

//╔══════════════════════════════════════════════════════════════════╗
//║  SECTION 1 — LOGGER                                             ║
//╚══════════════════════════════════════════════════════════════════╝

void LogMsg(int level, string msg)
{
   if(level > InpLogLevel) return;
   string pfx;
   switch(level) {
      case 1:  pfx = "[ERR] "; break;
      case 2:  pfx = "[INF] "; break;
      case 3:  pfx = "[DBG] "; break;
      default: pfx = "[---] ";
   }
   string line = TimeToString(TimeCurrent(), TIME_DATE|TIME_SECONDS) + " " + pfx + msg;
   Print(line);
   if(InpLogToFile && g_logFile != INVALID_HANDLE)
      FileWriteString(g_logFile, line + "\n");
}

void LogInfo (string m) { LogMsg(2, m); }
void LogDebug(string m) { LogMsg(3, m); }
void LogError(string m) { LogMsg(1, m); }

void LogReject(string sym, string filter, string reason)
{
   if(InpLogRejections)
      LogDebug("REJECT [" + sym + "][" + filter + "] " + reason);
}

//╔══════════════════════════════════════════════════════════════════╗
//║  SECTION 2 — PRESET SYSTEM                                      ║
//╚══════════════════════════════════════════════════════════════════╝
//  Call in OnInit. Sets g_eff* variables from preset values.
//  If PRESET_CUSTOM, g_eff* = input values (no override).
//
//  Preset table:
//  ┌─────────────┬──────────┬───────────┬────────────┬──────────┬──────────────┬──────────┐
//  │ Preset      │ Risk/tr  │ SoftLimit │ HardLimit  │ AbsMax   │ MaxOpenRisk  │ MaxTrades│
//  ├─────────────┼──────────┼───────────┼────────────┼──────────┼──────────────┼──────────┤
//  │ $1,000      │  0.25%   │   1.50%   │   3.00%    │  8.00%   │   0.50%      │    2     │
//  │ $5,000      │  0.25%   │   1.75%   │   3.00%    │  8.00%   │   0.75%      │    3     │
//  │ $10,000     │  0.30%   │   2.00%   │   3.25%    │  8.00%   │   1.00%      │    3     │
//  │ $50,000     │  0.40%   │   2.00%   │   3.50%    │  8.50%   │   1.25%      │    4     │
//  │ $100,000    │  0.50%   │   2.25%   │   3.50%    │  8.50%   │   1.50%      │    4     │
//  └─────────────┴──────────┴───────────┴────────────┴──────────┴──────────────┴──────────┘

void ApplyPreset()
{
   // Default: copy from inputs
   g_effRiskPct        = RiskPerTradePercent;
   g_effSoftLimitPct   = DailyLossSoftLimitPercent;
   g_effHardLimitPct   = DailyLossHardLimitPercent;
   g_effAbsMaxLossPct  = AbsoluteMaxLossPercent;
   g_effMaxOpenRiskPct = MaxOpenRiskPercent;
   g_effMaxDailyTrades = MaxTradesPerDay;
   g_effMaxLosingTrades= MaxLosingTradesPerDay;

   if(InpPreset == PRESET_CUSTOM) return;  // User controls everything

   switch(InpPreset)
   {
      case PRESET_SMALL_1K:
         g_effRiskPct        = 0.25;
         g_effSoftLimitPct   = 1.50;
         g_effHardLimitPct   = 3.00;
         g_effAbsMaxLossPct  = 8.00;
         g_effMaxOpenRiskPct = 0.50;
         g_effMaxDailyTrades = 2;
         g_effMaxLosingTrades= 2;
         break;

      case PRESET_SMALL_5K:
         g_effRiskPct        = 0.25;
         g_effSoftLimitPct   = 1.75;
         g_effHardLimitPct   = 3.00;
         g_effAbsMaxLossPct  = 8.00;
         g_effMaxOpenRiskPct = 0.75;
         g_effMaxDailyTrades = 3;
         g_effMaxLosingTrades= 2;
         break;

      case PRESET_MEDIUM_10K:
         g_effRiskPct        = 0.30;
         g_effSoftLimitPct   = 2.00;
         g_effHardLimitPct   = 3.25;
         g_effAbsMaxLossPct  = 8.00;
         g_effMaxOpenRiskPct = 1.00;
         g_effMaxDailyTrades = 3;
         g_effMaxLosingTrades= 2;
         break;

      case PRESET_LARGE_50K:
         g_effRiskPct        = 0.40;
         g_effSoftLimitPct   = 2.00;
         g_effHardLimitPct   = 3.50;
         g_effAbsMaxLossPct  = 8.50;
         g_effMaxOpenRiskPct = 1.25;
         g_effMaxDailyTrades = 4;
         g_effMaxLosingTrades= 2;
         break;

      case PRESET_XL_100K:
         g_effRiskPct        = 0.50;
         g_effSoftLimitPct   = 2.25;
         g_effHardLimitPct   = 3.50;
         g_effAbsMaxLossPct  = 8.50;
         g_effMaxOpenRiskPct = 1.50;
         g_effMaxDailyTrades = 4;
         g_effMaxLosingTrades= 2;
         break;
   }

   string presetName;
   switch(InpPreset) {
      case PRESET_SMALL_1K:    presetName = "Small $1K";    break;
      case PRESET_SMALL_5K:    presetName = "Small $5K";    break;
      case PRESET_MEDIUM_10K:  presetName = "Medium $10K";  break;
      case PRESET_LARGE_50K:   presetName = "Large $50K";   break;
      case PRESET_XL_100K:     presetName = "XL $100K";     break;
      default:                 presetName = "Custom";
   }

   LogInfo("── PRESET APPLIED: " + presetName + " ──────────────────────────");
   LogInfo(StringFormat("  Risk=%.2f%%  Soft=%.2f%%  Hard=%.2f%%  AbsMax=%.2f%%",
            g_effRiskPct, g_effSoftLimitPct, g_effHardLimitPct, g_effAbsMaxLossPct));
   LogInfo(StringFormat("  MaxOpenRisk=%.2f%%  MaxDailyTrades=%d  MaxLosses=%d",
            g_effMaxOpenRiskPct, g_effMaxDailyTrades, g_effMaxLosingTrades));
}

//╔══════════════════════════════════════════════════════════════════╗
//║  SECTION 3 — SYMBOL & PRICE UTILITIES                           ║
//╚══════════════════════════════════════════════════════════════════╝

double PipSize(string sym)
{
   int    d = (int)SymbolInfoInteger(sym, SYMBOL_DIGITS);
   double p = SymbolInfoDouble(sym, SYMBOL_POINT);
   return (d == 3 || d == 5) ? p * 10.0 : p;
}

double GetEMA(int handle, int shift = 1)
{
   double buf[];  ArraySetAsSeries(buf, true);
   return (CopyBuffer(handle, 0, shift, 1, buf) >= 1) ? buf[0] : 0.0;
}

double GetADX(int handle, int shift = 1)   // Buffer 0 = ADX main line
{
   double buf[];  ArraySetAsSeries(buf, true);
   return (CopyBuffer(handle, 0, shift, 1, buf) >= 1) ? buf[0] : 0.0;
}

double GetATR(int handle, int shift = 1)
{
   double buf[];  ArraySetAsSeries(buf, true);
   return (CopyBuffer(handle, 0, shift, 1, buf) >= 1) ? buf[0] : 0.0;
}

double GetHighestHigh(string sym, ENUM_TIMEFRAMES tf, int period, int startShift = 1)
{
   double hi[];  ArraySetAsSeries(hi, true);
   if(CopyHigh(sym, tf, startShift, period, hi) < period) return 0.0;
   return hi[ArrayMaximum(hi, 0, period)];
}

double GetLowestLow(string sym, ENUM_TIMEFRAMES tf, int period, int startShift = 1)
{
   double lo[];  ArraySetAsSeries(lo, true);
   if(CopyLow(sym, tf, startShift, period, lo) < period) return 0.0;
   return lo[ArrayMinimum(lo, 0, period)];
}

double FindSwingLow(string sym, ENUM_TIMEFRAMES tf, int lookback, int swingBars = 3)
{
   double lo[];  ArraySetAsSeries(lo, true);
   int need = lookback + swingBars + 1;
   if(CopyLow(sym, tf, 1, need, lo) < need)
      return lo[ArrayMinimum(lo, 0, MathMin(ArraySize(lo), lookback))];
   for(int i = swingBars; i < lookback; i++) {
      bool isSwing = true;
      for(int j = 1; j <= swingBars; j++)
         if(lo[i-j] <= lo[i] || lo[i+j] <= lo[i]) { isSwing = false; break; }
      if(isSwing) return lo[i];
   }
   return lo[ArrayMinimum(lo, 0, lookback)];
}

double FindSwingHigh(string sym, ENUM_TIMEFRAMES tf, int lookback, int swingBars = 3)
{
   double hi[];  ArraySetAsSeries(hi, true);
   int need = lookback + swingBars + 1;
   if(CopyHigh(sym, tf, 1, need, hi) < need)
      return hi[ArrayMaximum(hi, 0, MathMin(ArraySize(hi), lookback))];
   for(int i = swingBars; i < lookback; i++) {
      bool isSwing = true;
      for(int j = 1; j <= swingBars; j++)
         if(hi[i-j] >= hi[i] || hi[i+j] >= hi[i]) { isSwing = false; break; }
      if(isSwing) return hi[i];
   }
   return hi[ArrayMaximum(hi, 0, lookback)];
}

double NP(string sym, double price)
{
   return NormalizeDouble(price, (int)SymbolInfoInteger(sym, SYMBOL_DIGITS));
}

// ── Lot size calculation — equity-aware ─────────────────────────────
// Sizing base: equity (captures floating losses) capped at balance (anti over-lot)
double CalcLotSize(string sym, double slDist, double riskPct)
{
   if(slDist <= 0.0) return 0.0;

   double balance = AccountInfoDouble(ACCOUNT_BALANCE);
   double equity  = AccountInfoDouble(ACCOUNT_EQUITY);

   double sizingBase;
   if(UseEquityBasedSizing)
   {
      sizingBase = equity;
      if(UseBalanceCapForSizing)
         sizingBase = MathMin(balance, equity);   // Conservative: never larger than balance
   }
   else
      sizingBase = balance;

   if(sizingBase <= 0.0) return 0.0;

   double riskAmt      = sizingBase * riskPct / 100.0;
   double tickValue    = SymbolInfoDouble(sym, SYMBOL_TRADE_TICK_VALUE);
   double tickSize     = SymbolInfoDouble(sym, SYMBOL_TRADE_TICK_SIZE);
   if(tickValue <= 0.0 || tickSize <= 0.0) return 0.0;

   double valuePerMove = tickValue / tickSize;   // Account currency per lot per 1 price unit
   double lots         = riskAmt / (slDist * valuePerMove);

   double minLot  = SymbolInfoDouble(sym, SYMBOL_VOLUME_MIN);
   double maxLot  = SymbolInfoDouble(sym, SYMBOL_VOLUME_MAX);
   double stepLot = SymbolInfoDouble(sym, SYMBOL_VOLUME_STEP);

   lots = MathFloor(lots / stepLot) * stepLot;
   lots = MathMax(minLot, MathMin(maxLot, lots));
   return NormalizeDouble(lots, 2);
}

ENUM_ORDER_TYPE_FILLING DetectFillingMode(string sym)
{
   uint modes = (uint)SymbolInfoInteger(sym, SYMBOL_FILLING_MODE);
   if((modes & SYMBOL_FILLING_FOK) != 0) return ORDER_FILLING_FOK;
   if((modes & SYMBOL_FILLING_IOC) != 0) return ORDER_FILLING_IOC;
   return ORDER_FILLING_RETURN;
}

//╔══════════════════════════════════════════════════════════════════╗
//║  SECTION 4 — SESSION / NEWS / ROLLOVER FILTERS                  ║
//╚══════════════════════════════════════════════════════════════════╝

// Convert server time to GMT hour
int ServerToGMTHour(int serverHour)
{
   return (serverHour - GMTOffsetHours + 24) % 24;
}

// Check if current GMT hour is within any enabled trading session
// London:   07:00–16:00 GMT (inclusive of start, exclusive of end)
// New York: 13:00–22:00 GMT
// Asia:     23:00–08:00 GMT (wraps midnight)
bool IsWithinSession()
{
   MqlDateTime dt;
   TimeToStruct(TimeCurrent(), dt);
   int dow        = dt.day_of_week;        // 0=Sun … 6=Sat
   int serverMin  = dt.hour * 60 + dt.min;
   int gmtHour    = ServerToGMTHour(dt.hour);

   // Weekend
   if(dow == 0 || dow == 6) return false;

   // Monday opening gap protection
   if(BlockMondayOpen && dow == 1 && serverMin < MondayBlockMinutes)
   {
      LogDebug(StringFormat("Session: Monday open block (%d/%d min)", serverMin, MondayBlockMinutes));
      return false;
   }

   // Friday late-close protection
   if(BlockFridayClose && dow == 5 && dt.hour >= FridayBlockHour)
   {
      LogDebug(StringFormat("Session: Friday close block (hour %d >= %d)", dt.hour, FridayBlockHour));
      return false;
   }

   // Session window check (at least one session must be active)
   bool inLondon  = TradeLondon   && (gmtHour >= 7  && gmtHour < 16);
   bool inNewYork = TradeNewYork  && (gmtHour >= 13 && gmtHour < 22);
   bool inAsia    = TradeAsia     && (gmtHour >= 23  || gmtHour < 8);  // Wraps midnight

   if(!inLondon && !inNewYork && !inAsia)
   {
      LogDebug(StringFormat("Session: GMT hour %d not in any active session (London=%d NY=%d Asia=%d)",
               gmtHour, (int)TradeLondon, (int)TradeNewYork, (int)TradeAsia));
      return false;
   }
   return true;
}

// Block N minutes around daily rollover (swap time)
bool IsRolloverTime()
{
   if(!BlockTradingNearRollover) return false;

   MqlDateTime dt;
   TimeToStruct(TimeCurrent(), dt);
   int serverMin  = dt.hour * 60 + dt.min;
   int rolloverMin= RolloverServerHour * 60;

   // Handle day wrap: e.g. rollover at 22:00, block 21:30–22:15
   // and rollover at 00:00, block 23:30–00:15
   int minBefore = rolloverMin - RolloverBlockMinutesBefore;
   int minAfter  = rolloverMin + RolloverBlockMinutesAfter;

   // Normalise to [0, 1440)
   bool inWindow;
   if(minBefore < 0)   // Window wraps before midnight
   {
      inWindow = (serverMin >= minBefore + 1440) || (serverMin <= minAfter);
   }
   else if(minAfter >= 1440)  // Window wraps after midnight
   {
      inWindow = (serverMin >= minBefore) || (serverMin <= minAfter - 1440);
   }
   else
   {
      inWindow = (serverMin >= minBefore && serverMin <= minAfter);
   }

   if(inWindow)
   {
      LogDebug(StringFormat("RolloverFilter: Server %02d:%02d within block window (rollover at %02d:00 ±%d/+%d min)",
               dt.hour, dt.min, RolloverServerHour,
               RolloverBlockMinutesBefore, RolloverBlockMinutesAfter));
      return true;
   }
   return false;
}

// Dual spread filter: fixed points AND ATR-percentage
bool IsSpreadOK(string sym)
{
   double spreadPoints = (double)SymbolInfoInteger(sym, SYMBOL_SPREAD);
   double point        = SymbolInfoDouble(sym, SYMBOL_POINT);

   // Fixed spread check (if enabled)
   if(MaxSpreadPoints > 0 && spreadPoints > MaxSpreadPoints)
   {
      LogReject(sym, "SpreadFilter",
         StringFormat("Points spread %.0f > max %.0f points", spreadPoints, MaxSpreadPoints));
      return false;
   }

   // ATR-percentage spread check
   if(MaxSpreadAsATRPercent > 0)
   {
      double atr = GetATR(g_hATR, 1);
      if(atr > 0)
      {
         double spreadPct = (spreadPoints * point / atr) * 100.0;
         if(spreadPct > MaxSpreadAsATRPercent)
         {
            LogReject(sym, "SpreadFilter",
               StringFormat("Spread %.1f%% of ATR > max %.1f%% (spread=%.5f ATR=%.5f)",
                            spreadPct, MaxSpreadAsATRPercent, spreadPoints * point, atr));
            return false;
         }
      }
   }
   return true;
}

// MQL5 Economic Calendar — block high-impact news for symbol currencies
bool IsNewsTime(string sym)
{
   if(!EnableNewsFilter) return false;

   string baseCcy   = SymbolInfoString(sym, SYMBOL_CURRENCY_BASE);
   string profitCcy = SymbolInfoString(sym, SYMBOL_CURRENCY_PROFIT);

   datetime now  = TimeCurrent();
   datetime from = now - (datetime)(NewsBlockMinutesBefore * 60);
   datetime to   = now + (datetime)(NewsBlockMinutesAfter  * 60);

   MqlCalendarValue vals[];
   if(CalendarValueHistory(vals, from, to, NULL, NULL) <= 0) return false;

   for(int i = 0; i < ArraySize(vals); i++)
   {
      MqlCalendarEvent ev;
      if(!CalendarEventById(vals[i].event_id, ev)) continue;
      if(ev.importance != CALENDAR_IMPORTANCE_HIGH)  continue;

      MqlCalendarCountry country;
      if(!CalendarCountryById(ev.country_id, country)) continue;

      if(country.currency == baseCcy || country.currency == profitCcy)
      {
         LogReject(sym, "NewsFilter",
            StringFormat("High-impact news window (%s) — %d min before / %d min after",
                         country.currency, NewsBlockMinutesBefore, NewsBlockMinutesAfter));
         return true;
      }
   }
   return false;
}

//╔══════════════════════════════════════════════════════════════════╗
//║  SECTION 5 — REGIME FILTER                                      ║
//╚══════════════════════════════════════════════════════════════════╝

ENUM_MARKET_REGIME DetectRegime()
{
   double emaFast = GetEMA(g_hEMAFast, 1);
   double emaSlow = GetEMA(g_hEMASlow, 1);
   double adx     = GetADX(g_hADX,    1);
   double atr     = GetATR(g_hATR,    1);

   if(emaFast <= 0 || emaSlow <= 0 || adx <= 0 || atr <= 0)
   { LogDebug("Regime: indicators not ready"); return REGIME_UNDEFINED; }

   bool bullEMA  = (emaFast > emaSlow);
   bool bearEMA  = (emaFast < emaSlow);
   bool trending = (adx >= ADXTrendMin);
   bool ranging  = (adx <= ADXRangeMax);

   if(trending && bullEMA) {
      LogDebug(StringFormat("Regime: TREND_UP   ADX=%.1f EMA_gap=%.5f ATR=%.5f", adx, emaFast-emaSlow, atr));
      return REGIME_TREND_UP;
   }
   if(trending && bearEMA) {
      LogDebug(StringFormat("Regime: TREND_DOWN ADX=%.1f EMA_gap=%.5f ATR=%.5f", adx, emaSlow-emaFast, atr));
      return REGIME_TREND_DOWN;
   }
   if(ranging) {
      LogDebug(StringFormat("Regime: RANGE      ADX=%.1f (<=%.1f)", adx, ADXRangeMax));
      return REGIME_RANGE;
   }
   LogDebug(StringFormat("Regime: UNDEFINED  ADX=%.1f (between %.1f–%.1f)", adx, ADXRangeMax, ADXTrendMin));
   return REGIME_UNDEFINED;
}

//╔══════════════════════════════════════════════════════════════════╗
//║  SECTION 6 — STRATEGY A: TREND PULLBACK                         ║
//╚══════════════════════════════════════════════════════════════════╝

STradeSetup SignalTrendPullback(ENUM_MARKET_REGIME regime)
{
   STradeSetup s;
   string sym = g_symbol;

   if(!EnableTrendPullback)   { LogReject(sym, "A_Pullback", "Disabled");           return s; }
   if(regime != REGIME_TREND_UP && regime != REGIME_TREND_DOWN)
                              { LogReject(sym, "A_Pullback", "Not a trend regime");  return s; }

   bool isLong = (regime == REGIME_TREND_UP);

   double C[], O[], H[], L[];
   ArraySetAsSeries(C,true); ArraySetAsSeries(O,true);
   ArraySetAsSeries(H,true); ArraySetAsSeries(L,true);
   if(CopyClose(sym,InpRegimeTF,0,4,C)<4 || CopyOpen(sym,InpRegimeTF,0,4,O)<4 ||
      CopyHigh(sym,InpRegimeTF,0,4,H)<4  || CopyLow(sym,InpRegimeTF,0,4,L)<4)
   { LogReject(sym,"A_Pullback","Cannot copy OHLC"); return s; }

   double emaPull = GetEMA(g_hEMAPull, 1);
   double emaFast = GetEMA(g_hEMAFast, 1);
   double atr     = GetATR(g_hATR, 1);
   double ask     = SymbolInfoDouble(sym, SYMBOL_ASK);
   double bid     = SymbolInfoDouble(sym, SYMBOL_BID);

   double c1H = H[1], c1L = L[1], c1C = C[1], c1O = O[1];
   double c1R = c1H - c1L;
   if(c1R <= 0.0) { LogReject(sym,"A_Pullback","Doji bar"); return s; }

   if(isLong)
   {
      bool touchedZone = (c1L <= emaFast + atr * 0.3);
      bool closedAbove = (c1C > emaPull);
      bool bullClose   = (c1C > c1O) && ((c1C - c1L) / c1R >= 0.50);

      if(!touchedZone) { LogReject(sym,"A_Pullback",StringFormat("Long: low %.5f not in EMA zone (fast+0.3ATR=%.5f)",c1L,emaFast+atr*0.3)); return s; }
      if(!closedAbove) { LogReject(sym,"A_Pullback",StringFormat("Long: close %.5f < pullbackEMA %.5f",c1C,emaPull)); return s; }
      if(!bullClose)   { LogReject(sym,"A_Pullback","Long: no bullish confirmation bar"); return s; }

      double swingLow = FindSwingLow(sym, InpRegimeTF, InpSwingLookback);
      double slPrice  = MathMin(swingLow - atr * 0.15, emaFast - atr * ATR_SL_Multiplier);
      double slDist   = ask - slPrice;

      if(slDist < atr * 0.5) { LogReject(sym,"A_Pullback",StringFormat("Long: SL dist %.5f < 0.5×ATR",slDist)); return s; }

      double tpPrice = (InpTPMode == TP_FIXED_RR) ? (ask + slDist * RR_Target) : (ask + slDist * 4.0);
      double lots    = CalcLotSize(sym, slDist, g_effRiskPct);
      if(lots <= 0) { LogReject(sym,"A_Pullback","Long: lot=0"); return s; }

      s.symbol     = sym;  s.strategy   = "A_Pullback";
      s.orderType  = ORDER_TYPE_BUY;
      s.entryPrice = ask;
      s.stopLoss   = NP(sym, slPrice);   s.takeProfit = NP(sym, tpPrice);
      s.lotSize    = lots;
      s.riskAmount = AccountInfoDouble(ACCOUNT_EQUITY) * g_effRiskPct / 100.0;
      s.reason     = StringFormat("A_Long | emaPull=%.5f emaFast=%.5f swingLow=%.5f SL=%.5f TP=%.5f RR=%.1f ATR=%.5f",
                     emaPull, emaFast, swingLow, slPrice, tpPrice, RR_Target, atr);
      s.valid      = true;
   }
   else  // Short
   {
      bool touchedZone = (c1H >= emaFast - atr * 0.3);
      bool closedBelow = (c1C < emaPull);
      bool bearClose   = (c1C < c1O) && ((c1H - c1C) / c1R >= 0.50);

      if(!touchedZone) { LogReject(sym,"A_Pullback",StringFormat("Short: high %.5f not in EMA zone (fast-0.3ATR=%.5f)",c1H,emaFast-atr*0.3)); return s; }
      if(!closedBelow) { LogReject(sym,"A_Pullback",StringFormat("Short: close %.5f > pullbackEMA %.5f",c1C,emaPull)); return s; }
      if(!bearClose)   { LogReject(sym,"A_Pullback","Short: no bearish confirmation bar"); return s; }

      double swingHigh = FindSwingHigh(sym, InpRegimeTF, InpSwingLookback);
      double slPrice   = MathMax(swingHigh + atr * 0.15, emaFast + atr * ATR_SL_Multiplier);
      double slDist    = slPrice - bid;

      if(slDist < atr * 0.5) { LogReject(sym,"A_Pullback",StringFormat("Short: SL dist %.5f < 0.5×ATR",slDist)); return s; }

      double tpPrice = (InpTPMode == TP_FIXED_RR) ? (bid - slDist * RR_Target) : (bid - slDist * 4.0);
      double lots    = CalcLotSize(sym, slDist, g_effRiskPct);
      if(lots <= 0) { LogReject(sym,"A_Pullback","Short: lot=0"); return s; }

      s.symbol     = sym;  s.strategy   = "A_Pullback";
      s.orderType  = ORDER_TYPE_SELL;
      s.entryPrice = bid;
      s.stopLoss   = NP(sym, slPrice);   s.takeProfit = NP(sym, tpPrice);
      s.lotSize    = lots;
      s.riskAmount = AccountInfoDouble(ACCOUNT_EQUITY) * g_effRiskPct / 100.0;
      s.reason     = StringFormat("A_Short | emaPull=%.5f emaFast=%.5f swingHigh=%.5f SL=%.5f TP=%.5f RR=%.1f ATR=%.5f",
                     emaPull, emaFast, swingHigh, slPrice, tpPrice, RR_Target, atr);
      s.valid      = true;
   }
   return s;
}

//╔══════════════════════════════════════════════════════════════════╗
//║  SECTION 7 — STRATEGY B: VOLATILITY BREAKOUT                    ║
//╚══════════════════════════════════════════════════════════════════╝

STradeSetup SignalVolatilityBreakout(ENUM_MARKET_REGIME regime)
{
   STradeSetup s;
   string sym = g_symbol;

   if(!EnableBreakout)  { LogReject(sym,"B_Breakout","Disabled"); return s; }
   if(regime == REGIME_RANGE) { LogReject(sym,"B_Breakout","Skipped in RANGE regime"); return s; }

   double atr = GetATR(g_hATR, 1);
   double ask = SymbolInfoDouble(sym, SYMBOL_ASK);
   double bid = SymbolInfoDouble(sym, SYMBOL_BID);

   double boxHigh = GetHighestHigh(sym, InpRegimeTF, InpBoxPeriod, 1);
   double boxLow  = GetLowestLow  (sym, InpRegimeTF, InpBoxPeriod, 1);
   if(boxHigh <= 0 || boxLow <= 0 || boxHigh <= boxLow)
   { LogReject(sym,"B_Breakout","Invalid box"); return s; }

   double C[];  ArraySetAsSeries(C,true);
   if(CopyClose(sym, InpRegimeTF, 1, 2, C) < 2)
   { LogReject(sym,"B_Breakout","Cannot copy close"); return s; }

   double c1 = C[0], c2 = C[1];
   bool bullBreak = (c1 > boxHigh) && (c2 <= boxHigh);
   bool bearBreak = (c1 < boxLow)  && (c2 >= boxLow);

   if(!bullBreak && !bearBreak)
   { LogReject(sym,"B_Breakout",StringFormat("No fresh breakout | c1=%.5f c2=%.5f H=%.5f L=%.5f",c1,c2,boxHigh,boxLow)); return s; }

   double breakMag = bullBreak ? (c1 - boxHigh) : (boxLow - c1);
   if(breakMag < InpBreakoutATRMin * atr)
   { LogReject(sym,"B_Breakout",StringFormat("Weak: %.5f < %.2f×ATR(%.5f)",breakMag,InpBreakoutATRMin,atr)); return s; }

   if(bullBreak)
   {
      double slPrice = boxHigh - ATR_SL_Multiplier * atr;
      double slDist  = ask - slPrice;
      if(slDist <= 0) { LogReject(sym,"B_Breakout","Bull: negative SL dist"); return s; }
      double tpPrice = ask + slDist * RR_Target;
      double lots    = CalcLotSize(sym, slDist, g_effRiskPct);
      if(lots <= 0) { LogReject(sym,"B_Breakout","Bull: lot=0"); return s; }

      s.symbol=sym; s.strategy="B_Breakout"; s.orderType=ORDER_TYPE_BUY;
      s.entryPrice=ask; s.stopLoss=NP(sym,slPrice); s.takeProfit=NP(sym,tpPrice);
      s.lotSize=lots; s.riskAmount=AccountInfoDouble(ACCOUNT_EQUITY)*g_effRiskPct/100.0;
      s.reason=StringFormat("B_Bull | boxH=%.5f c1=%.5f mag=%.5f SL=%.5f TP=%.5f RR=%.1f",
               boxHigh,c1,breakMag,slPrice,tpPrice,RR_Target);
      s.valid=true;
   }
   else
   {
      double slPrice = boxLow + ATR_SL_Multiplier * atr;
      double slDist  = slPrice - bid;
      if(slDist <= 0) { LogReject(sym,"B_Breakout","Bear: negative SL dist"); return s; }
      double tpPrice = bid - slDist * RR_Target;
      double lots    = CalcLotSize(sym, slDist, g_effRiskPct);
      if(lots <= 0) { LogReject(sym,"B_Breakout","Bear: lot=0"); return s; }

      s.symbol=sym; s.strategy="B_Breakout"; s.orderType=ORDER_TYPE_SELL;
      s.entryPrice=bid; s.stopLoss=NP(sym,slPrice); s.takeProfit=NP(sym,tpPrice);
      s.lotSize=lots; s.riskAmount=AccountInfoDouble(ACCOUNT_EQUITY)*g_effRiskPct/100.0;
      s.reason=StringFormat("B_Bear | boxL=%.5f c1=%.5f mag=%.5f SL=%.5f TP=%.5f RR=%.1f",
               boxLow,c1,breakMag,slPrice,tpPrice,RR_Target);
      s.valid=true;
   }
   return s;
}

//╔══════════════════════════════════════════════════════════════════╗
//║  SECTION 8 — STRATEGY C: MEAN REVERSION                         ║
//╚══════════════════════════════════════════════════════════════════╝

STradeSetup SignalMeanReversion(ENUM_MARKET_REGIME regime)
{
   STradeSetup s;
   string sym = g_symbol;

   if(!EnableMeanReversion)   { LogReject(sym,"C_MeanRev","Disabled"); return s; }
   if(regime != REGIME_RANGE) { LogReject(sym,"C_MeanRev","Not RANGE regime"); return s; }

   double atr = GetATR(g_hATR, 1);
   double ask = SymbolInfoDouble(sym, SYMBOL_ASK);
   double bid = SymbolInfoDouble(sym, SYMBOL_BID);

   double rangeH = GetHighestHigh(sym, InpRegimeTF, InpRangePeriod, 1);
   double rangeL = GetLowestLow  (sym, InpRegimeTF, InpRangePeriod, 1);
   double rangeMid  = (rangeH + rangeL) * 0.5;
   double rangeSize = rangeH - rangeL;

   if(rangeSize < atr * 1.5)
   { LogReject(sym,"C_MeanRev",StringFormat("Range %.5f < 1.5×ATR(%.5f)",rangeSize,atr)); return s; }

   double C[],O[],H[],L[];
   ArraySetAsSeries(C,true); ArraySetAsSeries(O,true);
   ArraySetAsSeries(H,true); ArraySetAsSeries(L,true);
   if(CopyClose(sym,InpRegimeTF,0,3,C)<3 || CopyOpen(sym,InpRegimeTF,0,3,O)<3 ||
      CopyHigh(sym,InpRegimeTF,0,3,H)<3  || CopyLow(sym,InpRegimeTF,0,3,L)<3)
   { LogReject(sym,"C_MeanRev","Cannot copy OHLC"); return s; }

   double c1H=H[1],c1L=L[1],c1C=C[1],c1O=O[1],c1R=c1H-c1L;
   if(c1R<=0) return s;
   double edgeBuf = InpEdgeEntryATR * atr;

   bool nearLow    = (c1L<=rangeL+edgeBuf) && (ask<rangeL+edgeBuf*4.0);
   bool bullReject = (c1C>c1O) && ((c1C-c1L)/c1R>=0.60);
   bool nearHigh   = (c1H>=rangeH-edgeBuf) && (bid>rangeH-edgeBuf*4.0);
   bool bearReject = (c1C<c1O) && ((c1H-c1C)/c1R>=0.60);

   if(nearLow && bullReject)
   {
      double slPrice = rangeL - atr * 0.5;
      double slDist  = ask - slPrice;
      if(slDist<=0) return s;
      double tpPrice = MathMin(ask+slDist*RR_Target, rangeMid);
      double lots    = CalcLotSize(sym, slDist, g_effRiskPct);
      if(lots<=0) { LogReject(sym,"C_MeanRev","BUY: lot=0"); return s; }

      s.symbol=sym; s.strategy="C_MeanRev"; s.orderType=ORDER_TYPE_BUY;
      s.entryPrice=ask; s.stopLoss=NP(sym,slPrice); s.takeProfit=NP(sym,tpPrice);
      s.lotSize=lots; s.riskAmount=AccountInfoDouble(ACCOUNT_EQUITY)*g_effRiskPct/100.0;
      s.reason=StringFormat("C_Buy | rL=%.5f rH=%.5f mid=%.5f SL=%.5f TP=%.5f ATR=%.5f",
               rangeL,rangeH,rangeMid,slPrice,tpPrice,atr);
      s.valid=true;
   }
   else if(nearHigh && bearReject)
   {
      double slPrice = rangeH + atr * 0.5;
      double slDist  = slPrice - bid;
      if(slDist<=0) return s;
      double tpPrice = MathMax(bid-slDist*RR_Target, rangeMid);
      double lots    = CalcLotSize(sym, slDist, g_effRiskPct);
      if(lots<=0) { LogReject(sym,"C_MeanRev","SELL: lot=0"); return s; }

      s.symbol=sym; s.strategy="C_MeanRev"; s.orderType=ORDER_TYPE_SELL;
      s.entryPrice=bid; s.stopLoss=NP(sym,slPrice); s.takeProfit=NP(sym,tpPrice);
      s.lotSize=lots; s.riskAmount=AccountInfoDouble(ACCOUNT_EQUITY)*g_effRiskPct/100.0;
      s.reason=StringFormat("C_Sell | rL=%.5f rH=%.5f mid=%.5f SL=%.5f TP=%.5f ATR=%.5f",
               rangeL,rangeH,rangeMid,slPrice,tpPrice,atr);
      s.valid=true;
   }
   else {
      LogReject(sym,"C_MeanRev",StringFormat("No edge | ask=%.5f bid=%.5f rH=%.5f rL=%.5f buf=%.5f",
               ask,bid,rangeH,rangeL,edgeBuf));
   }
   return s;
}

//╔══════════════════════════════════════════════════════════════════╗
//║  SECTION 9 — SIGNAL DISPATCHER                                  ║
//╚══════════════════════════════════════════════════════════════════╝

STradeSetup GetSignal(ENUM_MARKET_REGIME regime)
{
   STradeSetup s;
   if(regime == REGIME_TREND_UP || regime == REGIME_TREND_DOWN)
   {
      if(EnableTrendPullback)  { s = SignalTrendPullback(regime);     if(s.valid) return s; }
      if(EnableBreakout)       { s = SignalVolatilityBreakout(regime); if(s.valid) return s; }
   }
   else if(regime == REGIME_RANGE)
   {
      if(EnableMeanReversion)  { s = SignalMeanReversion(regime);     if(s.valid) return s; }
   }
   return s;  // invalid — nothing fired
}

//╔══════════════════════════════════════════════════════════════════╗
//║  SECTION 10 — RISK MANAGER                                      ║
//╚══════════════════════════════════════════════════════════════════╝

// ── Per-symbol daily stats helpers ──────────────────────────────────

int GetSymbolTradesOpened(string sym)
{
   MqlDateTime dt;  TimeToStruct(TimeCurrent(), dt);
   dt.hour=0; dt.min=0; dt.sec=0;
   datetime today = StructToTime(dt);

   for(int i=0; i<ArraySize(g_symStats); i++)
      if(g_symStats[i].symbol == sym)
      {
         if(g_symStats[i].date != today) { g_symStats[i].tradesOpened=0; g_symStats[i].date=today; }
         return g_symStats[i].tradesOpened;
      }
   // Not found — create entry
   int n = ArraySize(g_symStats);
   ArrayResize(g_symStats, n+1);
   g_symStats[n].symbol       = sym;
   g_symStats[n].date         = today;
   g_symStats[n].tradesOpened = 0;
   return 0;
}

void IncrementSymbolTrades(string sym)
{
   MqlDateTime dt;  TimeToStruct(TimeCurrent(), dt);
   dt.hour=0; dt.min=0; dt.sec=0;
   datetime today = StructToTime(dt);

   for(int i=0; i<ArraySize(g_symStats); i++)
      if(g_symStats[i].symbol == sym)
      {
         if(g_symStats[i].date != today) { g_symStats[i].tradesOpened=0; g_symStats[i].date=today; }
         g_symStats[i].tradesOpened++;
         return;
      }
   int n = ArraySize(g_symStats);
   ArrayResize(g_symStats, n+1);
   g_symStats[n].symbol       = sym;
   g_symStats[n].date         = today;
   g_symStats[n].tradesOpened = 1;
}

// ── Drawdown calculations ────────────────────────────────────────────

// Equity-based daily drawdown % — captures both realized AND floating losses
// This is the FTMO/prop-firm standard: DD = (startEquity - currentEquity) / startBalance × 100
double CalcEquityDrawdownPct()
{
   double startBal = g_daily.startingBalance;
   if(startBal <= 0) return 0.0;
   double loss = g_daily.startingEquity - AccountInfoDouble(ACCOUNT_EQUITY);
   return MathMax(0.0, loss / startBal * 100.0);
}

// Absolute drawdown % from EA start — for FTMO overall 10% cap
double CalcAbsoluteDrawdownPct()
{
   if(g_absStartBalance <= 0) return 0.0;
   double loss = g_absStartBalance - AccountInfoDouble(ACCOUNT_EQUITY);
   return MathMax(0.0, loss / g_absStartBalance * 100.0);
}

// ── Open risk calculation ────────────────────────────────────────────
// Sum of (initial SL risk in account currency) for all EA positions
// direction: -1=all, 0=long only (BUY), 1=short only (SELL)
double CalcOpenRiskPct(int direction = -1)
{
   double totalRisk = 0.0;
   double balance   = AccountInfoDouble(ACCOUNT_BALANCE);
   if(balance <= 0) return 0.0;

   for(int i=PositionsTotal()-1; i>=0; i--)
   {
      if(PositionGetTicket(i)==0) continue;
      if(PositionGetInteger(POSITION_MAGIC) != InpMagicNumber) continue;

      ENUM_POSITION_TYPE pt = (ENUM_POSITION_TYPE)PositionGetInteger(POSITION_TYPE);
      if(direction==0 && pt!=POSITION_TYPE_BUY)  continue;
      if(direction==1 && pt!=POSITION_TYPE_SELL) continue;

      string sym   = PositionGetString(POSITION_SYMBOL);
      double entry = PositionGetDouble(POSITION_PRICE_OPEN);
      double sl    = PositionGetDouble(POSITION_SL);
      double lots  = PositionGetDouble(POSITION_VOLUME);
      if(sl == 0) continue;  // No SL — skip (shouldn't happen with our EA)

      double slDist = (pt==POSITION_TYPE_BUY) ? (entry - sl) : (sl - entry);
      if(slDist <= 0) continue;  // SL moved to BE or beyond entry

      double tv = SymbolInfoDouble(sym, SYMBOL_TRADE_TICK_VALUE);
      double ts = SymbolInfoDouble(sym, SYMBOL_TRADE_TICK_SIZE);
      if(tv <= 0 || ts <= 0) continue;

      totalRisk += (slDist / ts * tv) * lots;   // Risk in account currency
   }
   return totalRisk / balance * 100.0;
}

// Max risk in one direction (long or short) — correlated exposure
double CalcDirectionalRiskPct()
{
   return MathMax(CalcOpenRiskPct(0), CalcOpenRiskPct(1));
}

// ── Position counter ─────────────────────────────────────────────────
int CountPositions(string sym = "")
{
   int count=0;
   for(int i=PositionsTotal()-1; i>=0; i--)
   {
      if(PositionGetTicket(i)==0) continue;
      if(PositionGetInteger(POSITION_MAGIC)!=InpMagicNumber) continue;
      if(sym!="" && PositionGetString(POSITION_SYMBOL)!=sym) continue;
      count++;
   }
   return count;
}

// ── Daily / weekly stats refresh ─────────────────────────────────────
void RefreshDailyStats()
{
   MqlDateTime dt; TimeToStruct(TimeCurrent(), dt);
   dt.hour=0; dt.min=0; dt.sec=0;
   datetime today = StructToTime(dt);

   if(g_daily.date != today)
   {
      g_daily.date             = today;
      g_daily.startingBalance  = AccountInfoDouble(ACCOUNT_BALANCE);
      g_daily.startingEquity   = AccountInfoDouble(ACCOUNT_EQUITY);
      g_daily.realizedPnL      = 0.0;
      g_daily.tradesOpened     = 0;
      g_daily.consecutiveLosses= 0;
      g_daily.softLocked       = false;
      g_daily.hardLocked       = false;
      g_daily.dayLocked        = false;
      LogInfo(StringFormat("══ New Day %s | Balance=%.2f Equity=%.2f ══",
               TimeToString(today,TIME_DATE), g_daily.startingBalance, g_daily.startingEquity));
   }
}

void RefreshWeeklyStats()
{
   MqlDateTime dt; TimeToStruct(TimeCurrent(), dt);
   int fromMon = (dt.day_of_week==0) ? 6 : dt.day_of_week-1;
   datetime monday = TimeCurrent() - (datetime)(fromMon*86400);
   TimeToStruct(monday, dt); dt.hour=0; dt.min=0; dt.sec=0;
   datetime weekStart = StructToTime(dt);

   if(g_weekly.weekStart != weekStart)
   {
      g_weekly.weekStart       = weekStart;
      g_weekly.startingBalance = AccountInfoDouble(ACCOUNT_BALANCE);
      g_weekly.realizedPnL     = 0.0;
      g_weekly.weekLocked      = false;
      LogInfo(StringFormat("══ New Week %s | Balance=%.2f ══",
               TimeToString(weekStart,TIME_DATE), g_weekly.startingBalance));
   }
}

// Reconciliation scan of closed history (called every 60s from OnTimer)
void RebuildPnL()
{
   if(HistorySelect(g_daily.date, TimeCurrent()))
   {
      double pnl=0; int opened=0;
      for(int i=0; i<HistoryDealsTotal(); i++)
      {
         ulong tk=HistoryDealGetTicket(i);
         if(tk==0) continue;
         if((long)HistoryDealGetInteger(tk,DEAL_MAGIC)!=InpMagicNumber) continue;
         ENUM_DEAL_ENTRY en=(ENUM_DEAL_ENTRY)HistoryDealGetInteger(tk,DEAL_ENTRY);
         if(en==DEAL_ENTRY_IN) { opened++; continue; }
         if(en!=DEAL_ENTRY_OUT && en!=DEAL_ENTRY_OUT_BY) continue;
         pnl += HistoryDealGetDouble(tk,DEAL_PROFIT)
               +HistoryDealGetDouble(tk,DEAL_SWAP)
               +HistoryDealGetDouble(tk,DEAL_COMMISSION);
      }
      g_daily.realizedPnL  = pnl;
      g_daily.tradesOpened = opened;
   }
   if(HistorySelect(g_weekly.weekStart, TimeCurrent()))
   {
      double pnl=0;
      for(int i=0; i<HistoryDealsTotal(); i++)
      {
         ulong tk=HistoryDealGetTicket(i);
         if(tk==0) continue;
         if((long)HistoryDealGetInteger(tk,DEAL_MAGIC)!=InpMagicNumber) continue;
         ENUM_DEAL_ENTRY en=(ENUM_DEAL_ENTRY)HistoryDealGetInteger(tk,DEAL_ENTRY);
         if(en!=DEAL_ENTRY_OUT && en!=DEAL_ENTRY_OUT_BY) continue;
         pnl += HistoryDealGetDouble(tk,DEAL_PROFIT)
               +HistoryDealGetDouble(tk,DEAL_SWAP)
               +HistoryDealGetDouble(tk,DEAL_COMMISSION);
      }
      g_weekly.realizedPnL = pnl;
   }
}

// ── Master trading permission check ─────────────────────────────────
// Returns false with detailed log entry for EVERY rejection reason.
// Soft limit → logs WARNING, blocks new entries, existing trades continue.
// Hard limit → logs EMERGENCY, blocks all new entries.
bool IsTradingAllowed()
{
   RefreshDailyStats();
   RefreshWeeklyStats();

   string sym = g_symbol;

   //─ Hard lock ────────────────────────────────────────────────────────
   if(g_daily.hardLocked)
   { LogReject(sym,"HardLock","HARD daily loss limit — no new entries until midnight"); return false; }

   //─ Soft lock ────────────────────────────────────────────────────────
   if(g_daily.softLocked)
   { LogReject(sym,"SoftLock","SOFT daily loss limit — no new entries (existing positions held)"); return false; }

   //─ Week lock ────────────────────────────────────────────────────────
   if(g_weekly.weekLocked)
   { LogReject(sym,"WeekLock","Weekly loss limit reached"); return false; }

   //─ Equity-based daily drawdown (includes floating P&L) ─────────────
   double eqDD    = CalcEquityDrawdownPct();
   double balance = g_daily.startingBalance;

   if(eqDD >= g_effHardLimitPct && !g_daily.hardLocked)
   {
      g_daily.hardLocked = g_daily.dayLocked = true;
      LogError(StringFormat(
         "!!! HARD DAILY LIMIT HIT !!! EquityDD=%.2f%% >= Hard=%.2f%% | Equity=%.2f StartBal=%.2f — EMERGENCY LOCK",
         eqDD, g_effHardLimitPct, AccountInfoDouble(ACCOUNT_EQUITY), balance));
      return false;
   }

   if(eqDD >= g_effSoftLimitPct && !g_daily.softLocked)
   {
      g_daily.softLocked = g_daily.dayLocked = true;
      LogError(StringFormat(
         "!!! SOFT DAILY LIMIT HIT !!! EquityDD=%.2f%% >= Soft=%.2f%% | No new entries. Existing positions held.",
         eqDD, g_effSoftLimitPct));
      return false;
   }

   //─ Absolute max loss since EA start ────────────────────────────────
   double absDD = CalcAbsoluteDrawdownPct();
   if(absDD >= g_effAbsMaxLossPct)
   {
      g_daily.hardLocked = g_daily.dayLocked = true;
      LogError(StringFormat(
         "!!! ABSOLUTE MAX LOSS HIT !!! AbsDD=%.2f%% >= Limit=%.2f%% — ALL TRADING STOPPED",
         absDD, g_effAbsMaxLossPct));
      return false;
   }

   //─ Max losing trades per day ────────────────────────────────────────
   if(g_daily.consecutiveLosses >= g_effMaxLosingTrades)
   {
      g_daily.softLocked = g_daily.dayLocked = true;
      LogError(StringFormat("Max daily losses reached (%d/%d) — day soft-locked",
               g_daily.consecutiveLosses, g_effMaxLosingTrades));
      return false;
   }

   //─ Max trades per day ───────────────────────────────────────────────
   if(g_daily.tradesOpened >= g_effMaxDailyTrades)
   { LogReject(sym,"MaxTrades",StringFormat("%d/%d trades today",g_daily.tradesOpened,g_effMaxDailyTrades)); return false; }

   //─ Max total open risk % (all positions × SL risk) ─────────────────
   double openRisk = CalcOpenRiskPct();
   if(openRisk >= g_effMaxOpenRiskPct)
   { LogReject(sym,"OpenRisk",StringFormat("Open risk %.2f%% >= max %.2f%%",openRisk,g_effMaxOpenRiskPct)); return false; }

   //─ Correlated / directional exposure cap ───────────────────────────
   double corrRisk = CalcDirectionalRiskPct();
   if(corrRisk >= MaxCorrelatedExposurePercent)
   { LogReject(sym,"CorrExposure",StringFormat("Directional risk %.2f%% >= max %.2f%%",corrRisk,MaxCorrelatedExposurePercent)); return false; }

   //─ Per-symbol daily trade cap ───────────────────────────────────────
   int symTrades = GetSymbolTradesOpened(sym);
   if(symTrades >= MaxTradesPerSymbolPerDay)
   { LogReject(sym,"SymbolLimit",StringFormat("%d/%d trades on %s today",symTrades,MaxTradesPerSymbolPerDay,sym)); return false; }

   //─ Max 1 open position per symbol (no averaging) ───────────────────
   if(CountPositions(sym) >= 1)
   { LogReject(sym,"SymbolOpen","Position already open on this symbol — no averaging allowed"); return false; }

   return true;
}

//╔══════════════════════════════════════════════════════════════════╗
//║  SECTION 11 — TRADE MANAGER                                     ║
//╚══════════════════════════════════════════════════════════════════╝

bool ValidateBrokerLimits(STradeSetup &s)
{
   int    stopLvl = (int)SymbolInfoInteger(s.symbol, SYMBOL_TRADE_STOPS_LEVEL);
   double minDist = stopLvl * SymbolInfoDouble(s.symbol, SYMBOL_POINT);
   double ask     = SymbolInfoDouble(s.symbol, SYMBOL_ASK);
   double bid     = SymbolInfoDouble(s.symbol, SYMBOL_BID);

   if(s.orderType == ORDER_TYPE_BUY)
   {
      if(s.stopLoss  >= ask)             { LogReject(s.symbol,"Broker","BUY SL>=ask");          return false; }
      if(s.takeProfit<= ask)             { LogReject(s.symbol,"Broker","BUY TP<=ask");          return false; }
      if((ask-s.stopLoss)   < minDist)   { LogReject(s.symbol,"Broker","BUY SL too close");     return false; }
      if((s.takeProfit-ask) < minDist)   { LogReject(s.symbol,"Broker","BUY TP too close");     return false; }
   }
   else
   {
      if(s.stopLoss  <= bid)             { LogReject(s.symbol,"Broker","SELL SL<=bid");         return false; }
      if(s.takeProfit>= bid)             { LogReject(s.symbol,"Broker","SELL TP>=bid");         return false; }
      if((s.stopLoss-bid)   < minDist)   { LogReject(s.symbol,"Broker","SELL SL too close");    return false; }
      if((bid-s.takeProfit) < minDist)   { LogReject(s.symbol,"Broker","SELL TP too close");    return false; }
   }
   return true;
}

bool OpenTrade(STradeSetup &s)
{
   if(!ValidateBrokerLimits(s)) return false;

   g_trade.SetExpertMagicNumber((ulong)InpMagicNumber);
   g_trade.SetDeviationInPoints(10);
   g_trade.SetTypeFilling(DetectFillingMode(s.symbol));
   g_trade.SetAsyncMode(false);

   bool ok = (s.orderType == ORDER_TYPE_BUY)
             ? g_trade.Buy (s.lotSize, s.symbol, 0, s.stopLoss, s.takeProfit, InpEAComment)
             : g_trade.Sell(s.lotSize, s.symbol, 0, s.stopLoss, s.takeProfit, InpEAComment);

   if(ok)
   {
      g_daily.tradesOpened++;
      IncrementSymbolTrades(s.symbol);
      LogInfo(StringFormat("OPEN [%s] %s %.2f lots | SL=%.5f TP=%.5f | RiskAmt=%.2f | OpenRisk=%.2f%% | %s",
               s.strategy, (s.orderType==ORDER_TYPE_BUY?"BUY":"SELL"),
               s.lotSize, s.stopLoss, s.takeProfit, s.riskAmount, CalcOpenRiskPct(), s.reason));
   }
   else
   {
      LogError(StringFormat("OPEN FAILED | ret=%d %s | %s",
               g_trade.ResultRetcode(), g_trade.ResultComment(), s.reason));
   }
   return ok;
}

bool IsPartialDone(ulong ticket)
{
   for(int i=0; i<ArraySize(g_partialTickets); i++)
      if(g_partialTickets[i]==ticket) return true;
   return false;
}

void MarkPartialDone(ulong ticket)
{
   int sz=ArraySize(g_partialTickets); ArrayResize(g_partialTickets,sz+1);
   g_partialTickets[sz]=ticket;
}

void ManagePositions()
{
   double atr = GetATR(g_hATR, 1);
   if(atr<=0) return;

   for(int i=PositionsTotal()-1; i>=0; i--)
   {
      ulong ticket = PositionGetTicket(i);
      if(ticket==0) continue;
      if(PositionGetInteger(POSITION_MAGIC)!=InpMagicNumber) continue;

      string sym     = PositionGetString(POSITION_SYMBOL);
      ENUM_POSITION_TYPE pt = (ENUM_POSITION_TYPE)PositionGetInteger(POSITION_TYPE);
      double openPx  = PositionGetDouble(POSITION_PRICE_OPEN);
      double curSL   = PositionGetDouble(POSITION_SL);
      double curTP   = PositionGetDouble(POSITION_TP);
      double lots    = PositionGetDouble(POSITION_VOLUME);
      double ask     = SymbolInfoDouble(sym, SYMBOL_ASK);
      double bid     = SymbolInfoDouble(sym, SYMBOL_BID);
      double ptSize  = SymbolInfoDouble(sym, SYMBOL_POINT);

      double slDist = (pt==POSITION_TYPE_BUY) ? (openPx-curSL) : (curSL-openPx);
      if(slDist<=0) continue;

      double curR = (pt==POSITION_TYPE_BUY) ?
                    (bid-openPx)/slDist : (openPx-ask)/slDist;

      //── Break-Even (uses BreakEvenAtR from input) ─────────────────
      if(BreakEvenAtR > 0 && curR >= BreakEvenAtR)
      {
         if(pt==POSITION_TYPE_BUY)
         {
            double newSL = NP(sym, openPx + ptSize);
            if(newSL > curSL + ptSize)
               if(g_trade.PositionModify(ticket, newSL, curTP))
                  LogInfo(StringFormat("BE SET | %s #%llu SL=%.5f (R=%.2f)",sym,ticket,newSL,curR));
         }
         else
         {
            double newSL = NP(sym, openPx - ptSize);
            if(curSL==0 || newSL < curSL - ptSize)
               if(g_trade.PositionModify(ticket, newSL, curTP))
                  LogInfo(StringFormat("BE SET | %s #%llu SL=%.5f (R=%.2f)",sym,ticket,newSL,curR));
         }
      }

      //── Trailing Stop (uses TrailStartAtR from input) ─────────────
      if(InpTrailingEnable && curR >= TrailStartAtR)
      {
         double trailDist = atr * InpTrailingATRMult;
         double minStep   = atr * InpTrailingMinStep;

         if(pt==POSITION_TYPE_BUY)
         {
            double newSL = NP(sym, bid - trailDist);
            if(newSL > curSL + minStep)
               if(g_trade.PositionModify(ticket, newSL, curTP))
                  LogDebug(StringFormat("TRAIL | %s #%llu %.5f→%.5f (R=%.2f)",sym,ticket,curSL,newSL,curR));
         }
         else
         {
            double newSL = NP(sym, ask + trailDist);
            if(curSL==0 || newSL < curSL - minStep)
               if(g_trade.PositionModify(ticket, newSL, curTP))
                  LogDebug(StringFormat("TRAIL | %s #%llu %.5f→%.5f (R=%.2f)",sym,ticket,curSL,newSL,curR));
         }
      }

      //── Partial Close at 1R ────────────────────────────────────────
      if(InpPartialCloseEnable && curR>=1.0 && !IsPartialDone(ticket))
      {
         double closeLots = NormalizeDouble(lots * InpPartialCloseRatio, 2);
         double minLot    = SymbolInfoDouble(sym, SYMBOL_VOLUME_MIN);
         double stepLot   = SymbolInfoDouble(sym, SYMBOL_VOLUME_STEP);
         closeLots        = MathFloor(closeLots/stepLot)*stepLot;
         if(closeLots>=minLot && (lots-closeLots)>=minLot)
            if(g_trade.PositionClosePartial(ticket, closeLots))
            {
               LogInfo(StringFormat("PARTIAL | %s #%llu %.2f lots @ R=%.2f",sym,ticket,closeLots,curR));
               MarkPartialDone(ticket);
            }
      }
   }
}

//╔══════════════════════════════════════════════════════════════════╗
//║  SECTION 12 — NEW BAR DETECTION                                 ║
//╚══════════════════════════════════════════════════════════════════╝

bool IsNewBar()
{
   datetime bt[];  ArraySetAsSeries(bt,true);
   if(CopyTime(g_symbol, InpRegimeTF, 0, 1, bt)<1) return false;
   if(bt[0]==g_lastBarTime) return false;
   g_lastBarTime=bt[0];
   return true;
}

//╔══════════════════════════════════════════════════════════════════╗
//║  EVENT HANDLERS                                                  ║
//╚══════════════════════════════════════════════════════════════════╝

int OnInit()
{
   g_symbol = _Symbol;
   g_digits = (int)SymbolInfoInteger(g_symbol, SYMBOL_DIGITS);
   g_point  = SymbolInfoDouble(g_symbol, SYMBOL_POINT);

   // ── Log file ────────────────────────────────────────────────────
   if(InpLogToFile)
   {
      string fn = StringFormat("PropFirmEA_%s_%s.log",
                  g_symbol, TimeToString(TimeCurrent(), TIME_DATE));
      StringReplace(fn, ":", ".");
      g_logFile = FileOpen(fn, FILE_WRITE|FILE_TXT|FILE_SHARE_READ|FILE_ANSI);
      if(g_logFile==INVALID_HANDLE)
         Print("WARNING: Cannot open log file — console only");
   }

   // ── Apply preset (sets g_eff* variables) ────────────────────────
   ApplyPreset();

   // ── Absolute drawdown reference (set ONCE, never reset) ─────────
   g_absStartBalance = AccountInfoDouble(ACCOUNT_BALANCE);

   // ── CTrade setup ────────────────────────────────────────────────
   g_trade.SetExpertMagicNumber((ulong)InpMagicNumber);
   g_trade.SetDeviationInPoints(10);
   g_trade.SetTypeFilling(DetectFillingMode(g_symbol));

   // ── Indicator handles ───────────────────────────────────────────
   g_hEMAFast = iMA(g_symbol, InpRegimeTF, EMAFast,    0, MODE_EMA, PRICE_CLOSE);
   g_hEMASlow = iMA(g_symbol, InpRegimeTF, EMASlow,    0, MODE_EMA, PRICE_CLOSE);
   g_hEMAPull = iMA(g_symbol, InpRegimeTF, PullbackEMA,0, MODE_EMA, PRICE_CLOSE);
   g_hADX     = iADX(g_symbol, InpRegimeTF, ADXPeriod);
   g_hATR     = iATR(g_symbol, InpRegimeTF, ATRPeriod);

   if(g_hEMAFast==INVALID_HANDLE || g_hEMASlow==INVALID_HANDLE ||
      g_hEMAPull==INVALID_HANDLE || g_hADX==INVALID_HANDLE || g_hATR==INVALID_HANDLE)
   {
      LogError("INIT FAILED — indicator handle creation error");
      return INIT_FAILED;
   }

   // ── Initial stats ───────────────────────────────────────────────
   RefreshDailyStats();
   RefreshWeeklyStats();
   ArrayResize(g_partialTickets, 0);
   ArrayResize(g_symStats, 0);

   EventSetTimer(60);

   // ── Startup banner ──────────────────────────────────────────────
   string presetStr;
   switch(InpPreset) {
      case PRESET_SMALL_1K:   presetStr="Small $1K";   break;
      case PRESET_SMALL_5K:   presetStr="Small $5K";   break;
      case PRESET_MEDIUM_10K: presetStr="Medium $10K"; break;
      case PRESET_LARGE_50K:  presetStr="Large $50K";  break;
      case PRESET_XL_100K:    presetStr="XL $100K";    break;
      default:                presetStr="Custom";
   }
   LogInfo("╔════════════════════════════════════════════════════╗");
   LogInfo(StringFormat("║ PropFirmEA v2.00 | %s | TF=%s | Magic=%d",
            g_symbol, EnumToString(InpRegimeTF), InpMagicNumber));
   LogInfo(StringFormat("║ Preset: %-12s | StartBal=%.2f",
            presetStr, g_absStartBalance));
   LogInfo(StringFormat("║ Risk=%.2f%% | Soft=%.2f%% | Hard=%.2f%% | AbsMax=%.2f%%",
            g_effRiskPct, g_effSoftLimitPct, g_effHardLimitPct, g_effAbsMaxLossPct));
   LogInfo(StringFormat("║ MaxOpenRisk=%.2f%% | CorrExp=%.2f%% | MaxTrades=%d | MaxLosses=%d",
            g_effMaxOpenRiskPct, MaxCorrelatedExposurePercent,
            g_effMaxDailyTrades, g_effMaxLosingTrades));
   LogInfo(StringFormat("║ Strategies: Pullback=%d Breakout=%d MeanRev=%d",
            (int)EnableTrendPullback, (int)EnableBreakout, (int)EnableMeanReversion));
   LogInfo(StringFormat("║ Sessions: London=%d NY=%d Asia=%d | GMTOffset=%+d",
            (int)TradeLondon, (int)TradeNewYork, (int)TradeAsia, GMTOffsetHours));
   LogInfo(StringFormat("║ EquitySizing=%d BalanceCap=%d | News=%d | Rollover=%d",
            (int)UseEquityBasedSizing, (int)UseBalanceCapForSizing,
            (int)EnableNewsFilter, (int)BlockTradingNearRollover));
   LogInfo("╚════════════════════════════════════════════════════╝");

   return INIT_SUCCEEDED;
}

void OnDeinit(const int reason)
{
   if(g_hEMAFast!=INVALID_HANDLE) IndicatorRelease(g_hEMAFast);
   if(g_hEMASlow!=INVALID_HANDLE) IndicatorRelease(g_hEMASlow);
   if(g_hEMAPull!=INVALID_HANDLE) IndicatorRelease(g_hEMAPull);
   if(g_hADX    !=INVALID_HANDLE) IndicatorRelease(g_hADX);
   if(g_hATR    !=INVALID_HANDLE) IndicatorRelease(g_hATR);
   EventKillTimer();
   if(g_logFile!=INVALID_HANDLE) FileClose(g_logFile);
   LogInfo(StringFormat("PropFirmEA DEINIT reason=%d | DayPnL=%.2f | WeekPnL=%.2f | AbsDD=%.2f%%",
            reason, g_daily.realizedPnL, g_weekly.realizedPnL, CalcAbsoluteDrawdownPct()));
}

void OnTimer()
{
   RebuildPnL();   // Reconcile P&L from history every 60 s
   // Log live risk snapshot at DEBUG level
   LogDebug(StringFormat("RISK | EquityDD=%.2f%% AbsDD=%.2f%% OpenRisk=%.2f%% CorrRisk=%.2f%% DayTrades=%d DayLosses=%d Equity=%.2f",
            CalcEquityDrawdownPct(), CalcAbsoluteDrawdownPct(),
            CalcOpenRiskPct(), CalcDirectionalRiskPct(),
            g_daily.tradesOpened, g_daily.consecutiveLosses,
            AccountInfoDouble(ACCOUNT_EQUITY)));
}

void OnTick()
{
   // Position management: runs EVERY tick (trailing, BE, partial)
   ManagePositions();

   // New entry logic: only on bar close of regime timeframe
   if(!IsNewBar()) return;

   // Pre-entry filter chain — each step logged individually
   if(!IsWithinSession())     { LogDebug("Entry skip: outside session");  return; }
   if(IsRolloverTime())       { return; }
   if(!IsSpreadOK(g_symbol))  { return; }
   if(IsNewsTime(g_symbol))   { return; }
   if(!IsTradingAllowed())    { return; }

   // Regime detection
   ENUM_MARKET_REGIME regime = DetectRegime();
   if(regime == REGIME_UNDEFINED) { LogDebug("Regime UNDEFINED — no entry"); return; }

   // Signal evaluation
   STradeSetup setup = GetSignal(regime);
   if(!setup.valid) return;

   // Execute
   OpenTrade(setup);
}

// Real-time trade close handler — update counters instantly
void OnTradeTransaction(const MqlTradeTransaction &trans,
                        const MqlTradeRequest     &request,
                        const MqlTradeResult      &result)
{
   if(trans.type != TRADE_TRANSACTION_DEAL_ADD) return;

   ulong deal = trans.deal;
   if(!HistoryDealSelect(deal)) return;
   if((long)HistoryDealGetInteger(deal, DEAL_MAGIC) != InpMagicNumber) return;

   ENUM_DEAL_ENTRY entry = (ENUM_DEAL_ENTRY)HistoryDealGetInteger(deal, DEAL_ENTRY);
   if(entry != DEAL_ENTRY_OUT && entry != DEAL_ENTRY_OUT_BY) return;

   string sym    = HistoryDealGetString(deal, DEAL_SYMBOL);
   double profit = HistoryDealGetDouble(deal, DEAL_PROFIT)
                 + HistoryDealGetDouble(deal, DEAL_SWAP)
                 + HistoryDealGetDouble(deal, DEAL_COMMISSION);

   g_daily.realizedPnL  += profit;
   g_weekly.realizedPnL += profit;

   if(profit >= 0)
   {
      g_daily.consecutiveLosses = 0;
      LogInfo(StringFormat("CLOSED WIN  | %s +%.2f | DayPnL=%.2f | AbsDD=%.2f%%",
               sym, profit, g_daily.realizedPnL, CalcAbsoluteDrawdownPct()));
   }
   else
   {
      g_daily.consecutiveLosses++;
      LogInfo(StringFormat("CLOSED LOSS | %s %.2f | DayPnL=%.2f | EquityDD=%.2f%% | Losses=%d/%d",
               sym, profit, g_daily.realizedPnL,
               CalcEquityDrawdownPct(), g_daily.consecutiveLosses, g_effMaxLosingTrades));
   }

   // Real-time limit evaluation (no need to wait for next tick)
   double eqDD   = CalcEquityDrawdownPct();
   double absDD  = CalcAbsoluteDrawdownPct();

   if(eqDD >= g_effHardLimitPct && !g_daily.hardLocked)
   {
      g_daily.hardLocked = g_daily.dayLocked = true;
      LogError(StringFormat("!!! HARD LIMIT (closed) EquityDD=%.2f%% >= %.2f%% — DAY LOCKED",
               eqDD, g_effHardLimitPct));
   }
   else if(eqDD >= g_effSoftLimitPct && !g_daily.softLocked)
   {
      g_daily.softLocked = g_daily.dayLocked = true;
      LogError(StringFormat("!!! SOFT LIMIT (closed) EquityDD=%.2f%% >= %.2f%% — No new entries",
               eqDD, g_effSoftLimitPct));
   }

   if(absDD >= g_effAbsMaxLossPct && !g_daily.hardLocked)
   {
      g_daily.hardLocked = g_daily.dayLocked = true;
      LogError(StringFormat("!!! ABSOLUTE MAX LOSS (closed) AbsDD=%.2f%% >= %.2f%% — KILL SWITCH",
               absDD, g_effAbsMaxLossPct));
   }

   if(g_daily.consecutiveLosses >= g_effMaxLosingTrades && !g_daily.softLocked)
   {
      g_daily.softLocked = g_daily.dayLocked = true;
      LogError(StringFormat("!!! MAX LOSSES/DAY %d/%d — Soft lock activated",
               g_daily.consecutiveLosses, g_effMaxLosingTrades));
   }
}
//+------------------------------------------------------------------+
//| END OF FILE — PropFirmEA v2.00                                    |
//+------------------------------------------------------------------+
