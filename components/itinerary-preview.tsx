'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  MapPin,
  Calendar,
  DollarSign,
  Users,
  Star,
  Clock,
  Camera,
  Utensils,
  Bed,
  Plane,
  Eye,
  Heart,
  Info,
  Navigation,
  Lightbulb
} from 'lucide-react';
import { motion } from 'framer-motion';

interface ItineraryPreviewProps {
  /** original form values or stored prefs */
  preferences: any;
  /** alt. cities from City‑Selector agent */
  recommendations: any[];
  /** itinerary object returned by backend */
  itinerary: any;
  /** raw multi‑agent payload (for insights / tool results) */
  workflowData?: any;
  /**
   * Parent callback – when user clicks a card, we notify
   * so the page can call `/api/quick-plan` (or similar)
   * and then feed the new plan back as props.
   */
  onSelectCity?: (city: string) => void;
}

export function ItineraryPreview({
  preferences,
  recommendations,
  itinerary,
  workflowData,
  onSelectCity
}: ItineraryPreviewProps) {
  /* ---------- derived data ---------- */
  const cityAnalysis   = workflowData?.city_analysis;
  const localInsights  = workflowData?.local_insights;
  const travelLogistics = workflowData?.travel_logistics;

  const realRecommendations = cityAnalysis?.alternatives || recommendations || [];

  const realItinerary = {
    destination : cityAnalysis?.selectedCity
                || itinerary?.destination
                || preferences.destination,
    schedule    : travelLogistics?.schedule
                || itinerary?.schedule
                || [],
    totalBudget : travelLogistics?.totalBudget
                || itinerary?.totalBudget
                || { amount: '$0', breakdown: {} },
    confidence  : cityAnalysis?.confidence ?? 0.85
  };

  /* ---------- local UI state ---------- */
  const [activeCity, setActiveCity] = useState<string>(realItinerary.destination);

  const handleCityClick = (city: string) => {
    setActiveCity(city);
    onSelectCity?.(city);            // notify parent (if supplied)
  };

  /* ---------- helpers ---------- */
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'transport':     return <Plane     className="w-4 h-4 text-blue-600"   />;
      case 'accommodation': return <Bed       className="w-4 h-4 text-green-600"  />;
      case 'sightseeing':   return <Camera    className="w-4 h-4 text-purple-600" />;
      case 'dining':        return <Utensils  className="w-4 h-4 text-orange-600" />;
      case 'leisure':       return <Star      className="w-4 h-4 text-yellow-600" />;
      case 'cultural':      return <Info      className="w-4 h-4 text-indigo-600" />;
      case 'shopping':      return <Heart     className="w-4 h-4 text-pink-600"   />;
      default:              return <Clock     className="w-4 h-4 text-gray-600"   />;
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'hidden_gem':     return <Eye   className="w-4 h-4 text-purple-600" />;
      case 'local_favorite': return <Heart className="w-4 h-4 text-red-600"    />;
      case 'cultural_tip':   return <Info  className="w-4 h-4 text-blue-600"   />;
      case 'seasonal_event': return <Calendar className="w-4 h-4 text-green-600" />;
      case 'insider_secret': return <Star  className="w-4 h-4 text-yellow-600" />;
      default:               return <MapPin className="w-4 h-4 text-gray-600"  />;
    }
  };

  /* ====================================================================== */

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------------ */}
      {/* TOP‑LEVEL TRIP SUMMARY                                            */}
      {/* ------------------------------------------------------------------ */}
      <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border-indigo-200 dark:border-indigo-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-indigo-600" />
            Your Perfect Trip to {realItinerary.destination}
            {cityAnalysis?.confidence && (
              <Badge variant="outline" className="ml-auto bg-white/80">
                {Math.round(cityAnalysis.confidence * 100)}% AI Confidence
              </Badge>
            )}
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* destination */}
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-500" />
              <div>
                <p className="text-sm text-gray-600">Destination</p>
                <p className="font-medium">{realItinerary.destination}</p>
              </div>
            </div>
            {/* dates */}
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <div>
                <p className="text-sm text-gray-600">Duration</p>
                <p className="font-medium">
                  {preferences.startDate} – {preferences.endDate}
                </p>
              </div>
            </div>
            {/* budget */}
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-gray-500" />
              <div>
                <p className="text-sm text-gray-600">Budget</p>
                <p className="font-medium">{preferences.budget}</p>
              </div>
            </div>
            {/* travellers */}
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-500" />
              <div>
                <p className="text-sm text-gray-600">Travelers</p>
                <p className="font-medium">{preferences.travelers}</p>
              </div>
            </div>
          </div>

          {/* AI reasoning */}
          {cityAnalysis?.reasoning && (
            <div className="mt-4 p-4 bg-white/60 dark:bg-slate-800/60 rounded-lg">
              <h4 className="font-medium text-indigo-900 dark:text-indigo-100 mb-2">
                AI Analysis Summary
              </h4>
              <p className="text-sm text-indigo-800 dark:text-indigo-200">{cityAnalysis.reasoning}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* AI‑CURATED RECOMMENDATIONS ‑‑ NOW CLICKABLE                        */}
      {/* ------------------------------------------------------------------ */}
      <Card>
        <CardHeader>
          <CardTitle>AI‑Curated Destination Recommendations</CardTitle>
          <p className="text-sm text-gray-600">
            Generated by City Selector Agent with TavilySearchResults integration
          </p>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {realRecommendations.map((rec: any, i: number) => (
              <button
                key={i}
                onClick={() => handleCityClick(rec.city)}
                className={cn(
                  'text-left border-2 rounded-lg cursor-pointer transition-all hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-500',
                  activeCity === rec.city
                    ? 'ring-2 ring-indigo-500'
                    : i === 0
                      ? 'border-indigo-200 bg-indigo-50 dark:bg-indigo-900/20'
                      : 'border-gray-100'
                )}
              >
                {/* visual wrapper */}
                <Card className="border-0 shadow-none">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">{rec.city}</h4>
                      <span className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-500 fill-current" />
                        <span className="text-sm">{rec.rating}</span>
                      </span>
                    </div>

                    {i === 0 && (
                      <Badge variant="default" className="mb-2 bg-indigo-600">
                        ✨ Selected Destination
                      </Badge>
                    )}

                    <Badge variant="outline" className="mb-2">{rec.bestFor}</Badge>

                    <p className="text-sm text-gray-600 mb-2">{rec.budget}</p>

                    <div className="space-y-1 mb-3">
                      {rec.highlights?.map((h: string, idx: number) => (
                        <p key={idx} className="text-xs text-gray-500">• {h}</p>
                      ))}
                    </div>

                    {rec.reasoning && (
                      <p className="text-xs text-gray-600 italic">{rec.reasoning}</p>
                    )}
                  </CardContent>
                </Card>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* LOCAL EXPERT INSIGHTS                                             */}
      {/* ------------------------------------------------------------------ */}
      {localInsights?.insights?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Local Expert Insights & Hidden Gems</CardTitle>
            <p className="text-sm text-gray-600">
              Insider knowledge from Local Expert Agent
            </p>
          </CardHeader>

          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {localInsights.insights.map((ins: any, idx: number) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <Card className="border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-2 mb-2">
                        {getInsightIcon(ins.type)}
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">{ins.name}</h4>
                          <Badge variant="outline" className="text-xs mt-1">
                            {ins.type.replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>

                      <p className="text-xs text-gray-600 mb-2">{ins.description}</p>

                      <div className="space-y-1 text-xs text-gray-500">
                        <p><strong>📍 Location:</strong> {ins.location}</p>
                        {ins.rating      && <p><strong>⭐ Rating:</strong> {ins.rating}</p>}
                        {ins.priceRange  && <p><strong>💰 Price:</strong> {ins.priceRange}</p>}
                        {ins.bestTime    && <p><strong>⏰ Best Time:</strong> {ins.bestTime}</p>}
                        {ins.localTip    && (
                          <p className="text-blue-600 italic"><strong>💡 Tip:</strong> {ins.localTip}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {localInsights.localSecrets?.length > 0 && (
              <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <h4 className="font-medium text-yellow-900 dark:text-yellow-100 mb-2 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4" />
                  Insider Secrets
                </h4>
                <div className="space-y-1">
                  {localInsights.localSecrets.map((s: string, idx: number) => (
                    <p key={idx} className="text-sm text-yellow-800 dark:text-yellow-200">• {s}</p>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* DETAILED ITINERARY                                                */}
      {/* ------------------------------------------------------------------ */}
      <Card>
        <CardHeader>
          <CardTitle>
            Your Detailed Itinerary – {realItinerary.destination}
          </CardTitle>

          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>{realItinerary.schedule.length} days of unique experiences</span>
            <span>•</span>
            <span>Total Budget: {realItinerary.totalBudget.amount}</span>
            {travelLogistics?.confidence && (
              <>
                <span>•</span>
                <span>Confidence: {Math.round(travelLogistics.confidence * 100)}%</span>
              </>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {realItinerary.schedule.length ? (
            <div className="space-y-8">
              {realItinerary.schedule.map((day: any, dIdx: number) => (
                <motion.div
                  key={dIdx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: dIdx * 0.15 }}
                >
                  {/* Day Header */}
                  <div className="flex items-start gap-4 mb-6">
                    <div className="w-12 h-12 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full flex items-center justify-center text-lg font-bold shadow-lg">
                      {day.day}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold">{day.title}</h3>
                      <p className="text-indigo-600 dark:text-indigo-400 font-medium">{day.theme}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                        <span>📅 {day.date}</span>
                        <span>💰 {day.dailyBudget}</span>
                        {day.neighborhoods?.length > 0 && (
                          <span>🏘️ {day.neighborhoods.join(', ')}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Highlights */}
                  {day.highlights?.length > 0 && (
                    <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg">
                      <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
                        <Star className="w-4 h-4" />
                        Day Highlights
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {day.highlights.map((h: string, hIdx: number) => (
                          <Badge key={hIdx} variant="secondary" className="bg-blue-100 text-blue-800">
                            {h}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Activities */}
                  <div className="space-y-4 ml-8">
                    {day.activities.map((act: any, aIdx: number) => (
                      <motion.div
                        key={aIdx}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 + aIdx * 0.05 }}
                        className="relative"
                      >
                        {/* timeline connector */}
                        {aIdx < day.activities.length - 1 && (
                          <div className="absolute left-6 top-12 w-0.5 h-16 bg-gray-200 dark:bg-gray-700" />
                        )}

                        <div className="flex items-start gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
                          {/* bullet + time */}
                          <div className="flex items-center gap-3 min-w-[120px]">
                            <div className="w-3 h-3 bg-indigo-600 rounded-full" />
                            <span className="flex items-center gap-1 text-sm font-medium text-gray-600">
                              <Clock className="w-3 h-3 text-gray-400" />
                              {act.time}
                            </span>
                          </div>

                          {/* main block */}
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                {getActivityIcon(act.type)}
                                <h4 className="font-semibold">{act.activity}</h4>
                              </div>
                              <div className="flex items-center gap-2">
                                {act.cost && <Badge variant="outline">{act.cost}</Badge>}
                                {act.bookingRequired && (
                                  <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                                    Booking Required
                                  </Badge>
                                )}
                              </div>
                            </div>

                            {/* place + address */}
                            {act.specificPlace && (
                              <div className="mb-2">
                                <div className="flex items-center gap-2 mb-1">
                                  <MapPin className="w-3 h-3 text-indigo-600" />
                                  <span className="font-medium text-indigo-600">
                                    {act.specificPlace}
                                  </span>
                                </div>
                                {act.address && (
                                  <p className="text-xs text-gray-500 ml-5">{act.address}</p>
                                )}
                              </div>
                            )}

                            {/* description */}
                            {act.description && (
                              <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                                {act.description}
                              </p>
                            )}

                            {/* extras */}
                            <div className="flex items-center gap-4 mb-2 text-xs text-gray-500">
                              {act.duration && (
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {act.duration}
                                </span>
                              )}
                              {act.location && act.location !== act.specificPlace && (
                                <span className="flex items-center gap-1">
                                  <Navigation className="w-3 h-3" />
                                  {act.location}
                                </span>
                              )}
                            </div>

                            {act.tips?.length > 0 && (
                              <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-xs">
                                <div className="flex items-center gap-1 mb-1">
                                  <Lightbulb className="w-3 h-3 text-blue-600" />
                                  <span className="font-medium text-blue-800 dark:text-blue-200">Tips:</span>
                                </div>
                                <ul className="space-y-1 text-blue-700 dark:text-blue-300">
                                  {act.tips.map((tip: string, tIdx: number) => (
                                    <li key={tIdx}>• {tip}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {act.notes && (
                              <p className="text-xs text-blue-600 dark:text-blue-400 mt-2 italic">
                                {act.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Day notes */}
                  {day.notes?.length > 0 && (
                    <div className="ml-8 mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded text-xs text-gray-600 dark:text-gray-400">
                      <strong>Daily Notes:</strong> {day.notes.join(' • ')}
                    </div>
                  )}

                  {dIdx < realItinerary.schedule.length - 1 && <Separator className="mt-8" />}
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>Detailed itinerary is being generated…</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* BUDGET BREAKDOWN                                                  */}
      {/* ------------------------------------------------------------------ */}
      {realItinerary.totalBudget?.breakdown && (
        <Card>
          <CardHeader>
            <CardTitle>Budget Analysis</CardTitle>
            <p className="text-sm text-gray-600">
              Generated by Travel Concierge Agent with Calculate tool
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {Object.entries(realItinerary.totalBudget.breakdown).map(([cat, amt]) => (
                <div
                  key={cat}
                  className="text-center p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-lg"
                >
                  <p className="text-sm font-medium capitalize text-gray-700 dark:text-gray-300">{cat}</p>
                  <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{String(amt)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* LOW‑LEVEL TOOL RESULTS                                            */}
      {/* ------------------------------------------------------------------ */}
      {workflowData?.tool_results?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Multi‑Agent Tool Integration</CardTitle>
            <p className="text-sm text-gray-600">
              Real‑time data from TavilySearchResults &amp; Calculate tools
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {workflowData.tool_results.map((res: any, idx: number) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                    {res.tool === 'tavily-search' ? (
                      <Eye className="w-4 h-4 text-blue-600" />
                    ) : (
                      <DollarSign className="w-4 h-4 text-green-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{res.tool}</p>
                    <p className="text-xs text-gray-600">
                      {res.tool === 'tavily-search'
                        ? `Search: “${res.input?.query}”`
                        : `Calculation: “${res.input?.expression}”`}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {res.output?.results?.length ?? '✓'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
