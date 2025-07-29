'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  MapPin, 
  Calendar, 
  DollarSign, 
  Users, 
  Bot,
  CheckCircle2,
  Clock,
  Download,
  Sparkles,
  Search,
  Calculator,
  Zap,
  Network,
  Brain,
  Target,
  History,
  MessageSquare,
  ExternalLink,
  Menu,
  X,
  Wifi,
  WifiOff,
  AlertCircle,
  Plane,
  Globe
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { AgentActivity } from '@/components/agent-activity';
import { ItineraryPreview } from '@/components/itinerary-preview';
import { ChatInterface } from '@/components/chat-interface';
import { BookingRecommendations } from '@/components/booking-recommendations';
import { TravelHistory } from '@/components/travel-history';
import { ThemeToggle } from '@/components/theme-toggle';
import { DestinationSelector } from '@/components/destination-selector';
import { CacheKeyHelpers } from '@/lib/utils/cache-keys';

interface TravelPreferences {
  destination: string;
  comingFrom: string;
  budget: string;
  startDate: string;
  endDate: string;
  travelers: string;
  interests: string;
}

interface AgentState {
  id: string;
  name: string;
  status: 'waiting' | 'active' | 'completed' | 'error';
  progress: number;
  lastActivity: string;
  results?: any;
}

interface OrchestrationData {
  steps: number;
  agents_executed: string[];
  tool_calls: number;
  execution_time: number;
}

export function TravelPlanningInterface() {
  const [step, setStep] = useState(1);
  const [activeTab, setActiveTab] = useState('planner');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [preferences, setPreferences] = useState<TravelPreferences>({
    destination: '',
    comingFrom: '',
    budget: '',
    startDate: '',
    endDate: '',
    travelers: '',
    interests: ''
  });
  const [selectedDestination, setSelectedDestination] = useState<any>(null);
  const [agents, setAgents] = useState<AgentState[]>([
    {
      id: 'city-selector',
      name: 'City Selector Agent',
      status: 'waiting',
      progress: 0,
      lastActivity: 'Ready to analyze destinations with TavilySearchResults'
    },
    {
      id: 'local-expert',
      name: 'Local Expert Agent',
      status: 'waiting',
      progress: 0,
      lastActivity: 'Standing by for local insights and hidden gems'
    },
    {
      id: 'travel-concierge',
      name: 'Travel Concierge Agent',
      status: 'waiting',
      progress: 0,
      lastActivity: 'Ready to plan logistics with Calculate tool'
    }
  ]);
  const [overallProgress, setOverallProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [itinerary, setItinerary] = useState<any>(null);
  const [orchestrationData, setOrchestrationData] = useState<OrchestrationData | null>(null);
  const [workflowData, setWorkflowData] = useState<any>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [userId] = useState(() => `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const [selectedHistoryPlan, setSelectedHistoryPlan] = useState<any>(null);
  const [redisConnected, setRedisConnected] = useState<boolean | null>(null);

  const handleInputChange = (field: keyof TravelPreferences, value: string) => {
    setPreferences(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const canProceed = () => {
    return Object.values(preferences).every(value => value.trim() !== '');
  };

  const handleDestinationSelect = (destination: any) => {
    setSelectedDestination(destination);
    setPreferences(prev => ({
      ...prev,
      destination: `${destination.city}, ${destination.country}`
    }));
  };

  const startTravelPlanning = async () => {
    if (!canProceed()) {
      toast.error('Please fill in all travel preferences');
      return;
    }

    setStep(2);
    setIsProcessing(true);
    
    // Simulate agent processing with realistic timing
    const agentSteps = [
      { agent: 'city-selector', duration: 2000, message: 'Analyzing destinations and preferences...' },
      { agent: 'local-expert', duration: 3000, message: 'Gathering local insights and hidden gems...' },
      { agent: 'travel-concierge', duration: 2500, message: 'Creating detailed itinerary and logistics...' }
    ];

    let currentProgress = 0;
    
    for (let i = 0; i < agentSteps.length; i++) {
      const agentStep = agentSteps[i];
      
      // Update current agent to active
      setAgents(prev => prev.map(agent => 
        agent.id === agentStep.agent 
          ? { ...agent, status: 'active', lastActivity: agentStep.message }
          : agent
      ));

      // Simulate processing time with progress updates
      const progressIncrement = 100 / agentSteps.length;
      const stepDuration = agentStep.duration;
      const updateInterval = stepDuration / 10;

      for (let j = 0; j < 10; j++) {
        await new Promise(resolve => setTimeout(resolve, updateInterval));
        const stepProgress = (j + 1) * 10;
        const totalProgress = currentProgress + (stepProgress * progressIncrement / 100);
        
        setOverallProgress(totalProgress);
        setAgents(prev => prev.map(agent => 
          agent.id === agentStep.agent 
            ? { ...agent, progress: stepProgress }
            : agent
        ));
      }

      // Mark agent as completed
      setAgents(prev => prev.map(agent => 
        agent.id === agentStep.agent 
          ? { ...agent, status: 'completed', progress: 100, lastActivity: 'Analysis complete ✓' }
          : agent
      ));

      currentProgress += progressIncrement;
    }

    try {
      // Make actual API call
      const response = await fetch('/api/travel-planning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || 'Failed to start travel planning');
      }

      const result = await response.json();
      
      // Set results
      setRecommendations(result.recommendations || []);
      setItinerary(result.itinerary);
      setOrchestrationData(result.orchestration);
      setWorkflowData(result.workflow_data);
      setStep(3);
      
      setOverallProgress(100);
      
      toast.success('Your perfect trip is ready!', {
        description: `${result.orchestration?.steps} steps, ${result.orchestration?.tool_calls} tool calls`
      });
      
    } catch (error) {
      console.error('❌ Travel Planning Error:', error);
      
      toast.error('Failed to generate travel plan', {
        description: error instanceof Error ? error.message : 'Unknown error occurred'
      });
      
      // Reset agents to error state
      setAgents(prev => prev.map(agent => ({
        ...agent,
        status: 'error',
        lastActivity: error instanceof Error ? error.message : 'Planning failed'
      })));
    } finally {
      setIsProcessing(false);
    }
  };

  const generatePDF = async () => {
    try {
      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          preferences, 
          recommendations, 
          itinerary,
          orchestrationData,
          workflowData
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `travel-itinerary-${Date.now()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast.success('PDF itinerary downloaded successfully!');
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Failed to generate PDF. Please try again.');
    }
  };

  const resetPlanning = () => {
    setStep(1);
    setActiveTab('planner');
    setPreferences({
      destination: '',
      comingFrom: '',
      budget: '',
      startDate: '',
      endDate: '',
      travelers: '',
      interests: ''
    });
    setSelectedDestination(null);
    setAgents(prev => prev.map(agent => ({
      ...agent,
      status: 'waiting',
      progress: 0,
      lastActivity: agent.id === 'city-selector' ? 'Ready to analyze destinations with TavilySearchResults' :
                     agent.id === 'local-expert' ? 'Standing by for local insights and hidden gems' :
                     'Ready to plan logistics with Calculate tool'
    })));
    setOverallProgress(0);
    setIsProcessing(false);
    setRecommendations([]);
    setItinerary(null);
    setOrchestrationData(null);
    setWorkflowData(null);
    setJobId(null);
    setSelectedHistoryPlan(null);
    setRedisConnected(null);
  };

  const handleHistoryPlanSelect = (plan: any) => {
    setSelectedHistoryPlan(plan);
    setPreferences(plan.preferences);
    setRecommendations(plan.result.recommendations || []);
    setItinerary(plan.result.itinerary);
    setOrchestrationData(plan.result.orchestration);
    setWorkflowData(plan.result.workflow_data);
    setStep(3);
    setActiveTab('planner');
    toast.success('Travel plan loaded from history');
  };

  const handlePlanUpdate = (updatedPlan: any) => {
    console.log('🔄 handlePlanUpdate called with:', updatedPlan);
    setWorkflowData(updatedPlan);
    setItinerary(updatedPlan.itinerary);
    setRecommendations(updatedPlan.recommendations || []);
    
    // Auto-switch to itinerary tab to show changes
    console.log('🔄 Switching to itinerary tab...');
    setTimeout(() => {
      setActiveTab('itinerary');
      console.log('🔄 Tab switched to itinerary');
    }, 500);
    
    toast.success('Itinerary updated! Switching to Itinerary tab...');
  };

  const handleCitySwitch = async (city: string) => {
    if (city === preferences.destination) return;      // already selected
    toast.info(`Loading itinerary for ${city}…`);
    setIsProcessing(true);

    try {
      // Quick synchronous endpoint
      const res = await fetch(`/api/quick-plan?city=${encodeURIComponent(city)}`);
      if (!res.ok) throw new Error(await res.text());

      const data = await res.json();

      // update local state
      setPreferences(prev => ({ ...prev, destination: city }));
      setRecommendations(data.recommendations || []);
      setItinerary(data.itinerary);
      setWorkflowData(data.workflow_data);
      setOrchestrationData(data.workflow_data?.orchestration ?? null);

      toast.success(`Switched to ${city}`);
    } catch (err:any) {
      console.error(err);
      toast.error('Failed to load new city', { description: err.message });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-indigo-900">
      {/* Header */}
      <header className="border-b bg-white/90 dark:bg-slate-900/90 backdrop-blur-md sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl shadow-lg">
                <Network className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  TravelMind
                </h1>
                <p className="text-xs text-slate-600 dark:text-slate-400">AI Travel Orchestration</p>
              </div>
            </div>
            
            <div className="hidden md:flex items-center gap-4">
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <Brain className="w-3 h-3" />
                <span>StateGraph</span>
                <Search className="w-3 h-3" />
                <span>TavilySearch</span>
                <Calculator className="w-3 h-3" />
                <span>Calculate</span>
              </div>
              <ThemeToggle />
            </div>
            
            <div className="md:hidden flex items-center gap-2">
              <ThemeToggle />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>
          </div>
          
          {/* Mobile Menu */}
          <AnimatePresence>
            {mobileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="md:hidden mt-4 border-t pt-4"
              >
                <div className="flex flex-col gap-2">
                  <Button
                    variant={activeTab === 'planner' ? 'default' : 'ghost'}
                    onClick={() => { setActiveTab('planner'); setMobileMenuOpen(false); }}
                    className="justify-start"
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    Travel Planner
                  </Button>
                  <Button
                    variant={activeTab === 'history' ? 'default' : 'ghost'}
                    onClick={() => { setActiveTab('history'); setMobileMenuOpen(false); }}
                    className="justify-start"
                  >
                    <History className="w-4 h-4 mr-2" />
                    History
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Desktop Navigation */}
        <div className="hidden md:block mb-8">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
              <TabsTrigger value="planner" className="flex items-center gap-2 data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
                <Zap className="w-4 h-4" />
                Travel Planner
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2 data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
                <History className="w-4 h-4" />
                History
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Content */}
        {activeTab === 'planner' && (
          <>
            {/* Step Indicator */}
            <div className="flex items-center justify-center gap-2 md:gap-4 mb-8 overflow-x-auto">
              {[1, 2, 3].map((stepNumber) => (
                <div key={stepNumber} className="flex items-center gap-2">
                  <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                    step >= stepNumber 
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg' 
                      : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-400 border-2 border-slate-200 dark:border-slate-600'
                  }`}>
                    {step > stepNumber ? <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5" /> : stepNumber}
                  </div>
                  <span className={`text-xs md:text-sm font-medium transition-colors ${step >= stepNumber ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}>
                    {stepNumber === 1 ? 'Preferences' : stepNumber === 2 ? 'Processing' : 'Results'}
                  </span>
                  {stepNumber < 3 && (
                    <div className={`w-4 md:w-8 h-0.5 transition-colors ${step > stepNumber ? 'bg-gradient-to-r from-indigo-600 to-purple-600' : 'bg-slate-200 dark:bg-slate-700'}`} />
                  )}
                </div>
              ))}
            </div>

            {/* Step 1: Travel Preferences */}
            {step === 1 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-6xl mx-auto space-y-6"
              >
                <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200 dark:border-slate-700 shadow-xl">
                  <CardHeader className="text-center">
                    <CardTitle className="flex items-center justify-center gap-2 text-2xl">
                      <Globe className="w-6 h-6 text-indigo-600" />
                      Plan Your Perfect Trip
                    </CardTitle>
                    <p className="text-slate-600 dark:text-slate-400">
                      Tell us about your travel preferences and we'll create a personalized itinerary
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="destination" className="text-slate-700 dark:text-slate-300 font-medium">Where do you want to go?</Label>
                        <Input
                          id="destination"
                          placeholder="e.g., Europe, Southeast Asia, Japan, New York"
                          value={preferences.destination}
                          onChange={(e) => handleInputChange('destination', e.target.value)}
                          className="bg-white/50 dark:bg-slate-700/50 border-slate-300 dark:border-slate-600"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="comingFrom" className="text-slate-700 dark:text-slate-300 font-medium">Where are you coming from?</Label>
                        <Input
                          id="comingFrom"
                          placeholder="e.g., New York, London, Sydney"
                          value={preferences.comingFrom}
                          onChange={(e) => handleInputChange('comingFrom', e.target.value)}
                          className="bg-white/50 dark:bg-slate-700/50 border-slate-300 dark:border-slate-600"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="budget" className="text-slate-700 dark:text-slate-300 font-medium">Budget Range</Label>
                      <Select 
                        value={preferences.budget} 
                        onValueChange={(value) => handleInputChange('budget', value)}
                      >
                        <SelectTrigger className="bg-white/50 dark:bg-slate-700/50 border-slate-300 dark:border-slate-600">
                          <SelectValue placeholder="Select your budget range" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="budget">Budget ($0 - $2,000)</SelectItem>
                          <SelectItem value="mid-range">Mid-range ($2,000 - $5,000)</SelectItem>
                          <SelectItem value="luxury">Luxury ($5,000+)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="start-date" className="text-slate-700 dark:text-slate-300 font-medium">Start Date</Label>
                        <Input
                          id="start-date"
                          type="date"
                          value={preferences.startDate}
                          onChange={(e) => handleInputChange('startDate', e.target.value)}
                          className="bg-white/50 dark:bg-slate-700/50 border-slate-300 dark:border-slate-600"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="end-date" className="text-slate-700 dark:text-slate-300 font-medium">End Date</Label>
                        <Input
                          id="end-date"
                          type="date"
                          value={preferences.endDate}
                          onChange={(e) => handleInputChange('endDate', e.target.value)}
                          className="bg-white/50 dark:bg-slate-700/50 border-slate-300 dark:border-slate-600"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="travelers" className="text-slate-700 dark:text-slate-300 font-medium">Number of Travelers</Label>
                      <Select 
                        value={preferences.travelers} 
                        onValueChange={(value) => handleInputChange('travelers', value)}
                      >
                        <SelectTrigger className="bg-white/50 dark:bg-slate-700/50 border-slate-300 dark:border-slate-600">
                          <SelectValue placeholder="How many people are traveling?" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Solo traveler</SelectItem>
                          <SelectItem value="2">2 travelers</SelectItem>
                          <SelectItem value="3-4">3-4 travelers</SelectItem>
                          <SelectItem value="5+">5+ travelers</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="interests" className="text-slate-700 dark:text-slate-300 font-medium">Interests & Activities</Label>
                      <Textarea
                        id="interests"
                        placeholder="e.g., museums, outdoor activities, food tours, nightlife, cultural experiences, adventure sports"
                        value={preferences.interests}
                        onChange={(e) => handleInputChange('interests', e.target.value)}
                        className="min-h-[100px] bg-white/50 dark:bg-slate-700/50 border-slate-300 dark:border-slate-600"
                      />
                    </div>

                    <Button 
                      onClick={startTravelPlanning}
                      disabled={!canProceed() || isProcessing}
                      className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      <Sparkles className="w-5 h-5 mr-2" />
                      Create My Perfect Trip
                    </Button>
                  </CardContent>
                </Card>

                {/* Destination Selector */}
                {preferences.destination && preferences.comingFrom && (
                  <DestinationSelector
                    preferences={preferences}
                    onDestinationSelect={handleDestinationSelect}
                    selectedDestination={selectedDestination}
                  />
                )}
              </motion.div>
            )}

            {/* Step 2: Processing */}
            {step === 2 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-4xl mx-auto space-y-6"
              >
                <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200 dark:border-slate-700 shadow-xl">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Network className="w-5 h-5 text-indigo-600" />
                      AI Agents Working on Your Trip
                    </CardTitle>
                    <p className="text-slate-600 dark:text-slate-400">
                      Our specialized AI agents are analyzing your preferences and creating your perfect itinerary
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Overall Progress</span>
                        <span>{Math.round(overallProgress)}%</span>
                      </div>
                      <Progress value={overallProgress} className="h-2" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {agents.map((agent) => (
                        <AgentActivity key={agent.id} agent={agent} />
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border-indigo-200 dark:border-indigo-800">
                  <CardHeader>
                    <CardTitle className="text-indigo-900 dark:text-indigo-100">Why Our AI is Special</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center gap-3 p-3 bg-white/60 dark:bg-slate-800/60 rounded-lg">
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                        <div>
                          <p className="font-medium text-green-800 dark:text-green-400">Multi-Agent Intelligence</p>
                          <p className="text-sm text-green-600 dark:text-green-300">Specialized experts for each aspect</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-white/60 dark:bg-slate-800/60 rounded-lg">
                        <Clock className="w-5 h-5 text-blue-600" />
                        <div>
                          <p className="font-medium text-blue-800 dark:text-blue-400">Real-time Data</p>
                          <p className="text-sm text-blue-600 dark:text-blue-300">Live search and current information</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Step 3: Results */}
            {step === 3 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-7xl mx-auto space-y-6"
              >
                <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200 dark:border-slate-700 shadow-xl">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      Your Perfect Trip is Ready!
                    </CardTitle>
                    {orchestrationData && (
                      <div className="flex flex-wrap gap-4 text-sm text-slate-600 dark:text-slate-400">
                        <span>🔄 {orchestrationData.steps} orchestration steps</span>
                        <span>🤖 {orchestrationData.agents_executed?.length || 0} agents executed</span>
                        <span>🛠️ {orchestrationData.tool_calls} tool calls</span>
                        <span>⏱️ {Math.round(orchestrationData.execution_time / 1000)}s execution time</span>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <Button onClick={generatePDF} variant="outline" className="border-indigo-200 text-indigo-700 hover:bg-indigo-50">
                        <Download className="w-4 h-4 mr-2" />
                        Download PDF
                      </Button>
                      <Button onClick={resetPlanning} variant="outline" className="border-slate-200 text-slate-700 hover:bg-slate-50">
                        Plan Another Trip
                      </Button>
                    </div>
                  </CardHeader>
                </Card>

                <Tabs defaultValue="itinerary" className="w-full">
                  <TabsList className="grid w-full grid-cols-3 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
                    <TabsTrigger value="itinerary" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white">Itinerary</TabsTrigger>
                    <TabsTrigger value="chat" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
                      <MessageSquare className="w-4 h-4 mr-1" />
                      Chat & Modify
                    </TabsTrigger>
                    <TabsTrigger value="bookings" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
                      <ExternalLink className="w-4 h-4 mr-1" />
                      Bookings
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="itinerary">
                    <ItineraryPreview
                      preferences={preferences}
                      recommendations={recommendations}
                      itinerary={itinerary}
                      workflowData={workflowData}
                      /* THE ONLY NEW PROP ↓↓↓ */
                      onSelectCity={handleCitySwitch}
                    />
                  </TabsContent>
                  
                  <TabsContent value="chat">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <ChatInterface
                        planId={CacheKeyHelpers.generateTravelPlanKey(preferences)}
                        initialData={{
                          itinerary: itinerary,
                          recommendations: recommendations,
                          workflow_data: workflowData,
                          orchestration: orchestrationData
                        }}
                        onPlanUpdate={handlePlanUpdate}
                      />
                      <div className="space-y-4">
                        <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
                          <CardHeader>
                            <CardTitle className="text-lg">Quick Modifications</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            <Button variant="outline" className="w-full justify-start">
                              <DollarSign className="w-4 h-4 mr-2" />
                              Reduce budget by 20%
                            </Button>
                            <Button variant="outline" className="w-full justify-start">
                              <Calendar className="w-4 h-4 mr-2" />
                              Add more cultural activities
                            </Button>
                            <Button variant="outline" className="w-full justify-start">
                              <MapPin className="w-4 h-4 mr-2" />
                              Find romantic restaurants
                            </Button>
                            <Button variant="outline" className="w-full justify-start">
                              <Users className="w-4 h-4 mr-2" />
                              Optimize for group travel
                            </Button>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="bookings">
                    <BookingRecommendations
                      destination={itinerary?.destination || preferences.destination}
                      dates={{ start: preferences.startDate, end: preferences.endDate }}
                      travelers={preferences.travelers}
                      budget={preferences.budget}
                      origin={preferences.comingFrom}
                    />
                  </TabsContent>
                </Tabs>
              </motion.div>
            )}
          </>
        )}

        {activeTab === 'history' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto"
          >
            <TravelHistory
              userId={userId}
              onSelectPlan={handleHistoryPlanSelect}
            />
          </motion.div>
        )}
      </div>
    </div>
  );
}