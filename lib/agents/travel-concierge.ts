
import { GoogleGenerativeAI } from '@google/generative-ai';
import { fetchTopPlaces } from '../tools/tavily-wrapper'; // 👈 adjust one “..” if your folder depth differs
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export interface Activity {
  time: string;
  activity: string;
  type: 'transport' | 'accommodation' | 'sightseeing' | 'dining' | 'leisure' | 'shopping' | 'cultural';
  duration?: string;
  cost?: string;
  location?: string;
  specificPlace?: string;
  address?: string;
  coordinates?: { lat: number; lng: number };
  bookingRequired?: boolean;
  priority?: 'high' | 'medium' | 'low';
  notes?: string;
  image?: string;
  description?: string;
  tips?: string[];
}

export interface DaySchedule {
  day: number;
  date: string;
  title: string;
  theme: string;
  activities: Activity[];
  dailyBudget: string;
  notes?: string[];
  weather?: string;
  transportation?: string;
  neighborhoods: string[];
  totalWalkingTime?: string;
  highlights: string[];
}

export interface TravelLogistics {
  schedule: DaySchedule[];
  totalBudget: {
    amount: string;
    currency: string;
    breakdown: {
      accommodation: string;
      food: string;
      activities: string;
      transport: string;
      misc: string;
    };
  };
  bookingInfo: {
    hotels: any[];
    flights: any[];
    activities: any[];
    restaurants: any[];
  };
  calculations: any[];
  logistics: {
    transportation: string[];
    packing: string[];
    documents: string[];
    emergency: any;
  };
  confidence: number;
}

export class TravelConcierge {
  private model: any;

  constructor() {
    this.model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
  }

  async createItinerary(
    city: string,
    insights: any[],
    startDate: string,
    endDate: string,
    travelers: string,
    budget: string
  ): Promise<TravelLogistics> {
    console.log(`✈️ Travel Concierge Agent: Creating diverse itinerary for ${city}`);
    
    const days = this.calculateDays(startDate, endDate);
    
    const prompt = `
      As a Travel Concierge AI agent, create a comprehensive and DIVERSE travel logistics plan for ${city}:
      
      Trip Details:
      - Destination: ${city}
      - Dates: ${startDate} to ${endDate} (${days} days)
      - Travelers: ${travelers}
      - Budget Range: ${budget}
      - Local Insights: ${JSON.stringify(insights)}
      
      CRITICAL REQUIREMENTS:
      1. Each day must have a UNIQUE theme and completely different activities
      2. Include SPECIFIC places with actual names, addresses, and descriptions
      3. Vary neighborhoods - explore different areas of ${city} each day
      4. Include diverse activity types: cultural, food, nature, shopping, entertainment
      5. Provide specific restaurant names, attraction names, and exact locations
      6. Include realistic timing and logical geographical routing
      7. Add specific tips and insider knowledge for each location
      
      Day Themes (vary these):
      - Historic & Cultural Exploration
      - Food & Market Discovery
      - Nature & Outdoor Adventures
      - Art & Museum Day
      - Local Neighborhoods & Hidden Gems
      - Shopping & Entertainment
      - Relaxation & Wellness
      
      For each activity, provide:
      - Specific place name (not generic descriptions)
      - Exact address or area
      - Detailed description of what to expect
      - Practical tips and insider knowledge
      - Realistic costs and timing
      - Booking requirements
      
      Make each day feel like a completely different experience in ${city}.
    `;

    try {
      const result = await this.model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              schedule: {
                type: "ARRAY",
                description: "Day-by-day diverse itinerary schedule",
                items: {
                  type: "OBJECT",
                  properties: {
                    day: { type: "NUMBER" },
                    date: { type: "STRING" },
                    title: { type: "STRING" },
                    theme: { type: "STRING" },
                    activities: {
                      type: "ARRAY",
                      items: {
                        type: "OBJECT",
                        properties: {
                          time: { type: "STRING" },
                          activity: { type: "STRING" },
                          type: { 
                            type: "STRING",
                            enum: ["transport", "accommodation", "sightseeing", "dining", "leisure", "shopping", "cultural"]
                          },
                          duration: { type: "STRING" },
                          cost: { type: "STRING" },
                          location: { type: "STRING" },
                          specificPlace: { type: "STRING" },
                          address: { type: "STRING" },
                          bookingRequired: { type: "BOOLEAN" },
                          notes: { type: "STRING" },
                          description: { type: "STRING" },
                          tips: {
                            type: "ARRAY",
                            items: { type: "STRING" }
                          }
                        },
                        required: ["time", "activity", "type", "specificPlace", "description"]
                      }
                    },
                    dailyBudget: { type: "STRING" },
                    neighborhoods: {
                      type: "ARRAY",
                      items: { type: "STRING" }
                    },
                    highlights: {
                      type: "ARRAY",
                      items: { type: "STRING" }
                    },
                    notes: {
                      type: "ARRAY",
                      items: { type: "STRING" }
                    }
                  },
                  required: ["day", "date", "title", "theme", "activities", "dailyBudget", "neighborhoods", "highlights"]
                }
              },
              totalBudget: {
                type: "OBJECT",
                properties: {
                  amount: { type: "STRING" },
                  currency: { type: "STRING" },
                  breakdown: {
                    type: "OBJECT",
                    properties: {
                      accommodation: { type: "STRING" },
                      food: { type: "STRING" },
                      activities: { type: "STRING" },
                      transport: { type: "STRING" },
                      misc: { type: "STRING" }
                    },
                    required: ["accommodation", "food", "activities", "transport", "misc"]
                  }
                },
                required: ["amount", "currency", "breakdown"]
              },
              logistics: {
                type: "OBJECT",
                properties: {
                  transportation: {
                    type: "ARRAY",
                    items: { type: "STRING" }
                  },
                  packing: {
                    type: "ARRAY",
                    items: { type: "STRING" }
                  },
                  documents: {
                    type: "ARRAY",
                    items: { type: "STRING" }
                  }
                },
                required: ["transportation", "packing", "documents"]
              },
              confidence: { 
                type: "NUMBER", 
                minimum: 0, 
                maximum: 1 
              }
            },
            required: ["schedule", "totalBudget", "logistics", "confidence"]
          }
        }
      });
      
      const response = await result.response;
      const itinerary = JSON.parse(response.text());
      
      // Add calculations and booking info
      itinerary.calculations = this.generateCalculations(days, budget, travelers);
      itinerary.bookingInfo = this.generateBookingInfo(city, startDate, endDate, itinerary.schedule);
      
      console.log('✅ Travel Concierge Agent: Diverse itinerary complete', {
        days: itinerary.schedule?.length || 0,
        totalBudget: itinerary.totalBudget?.amount,
        confidence: itinerary.confidence
      });
      
      return itinerary;
    } catch (error) {
      console.error('❌ Travel Concierge Agent error:', error);
      return await this.getMockItinerary(city, startDate, endDate, travelers, budget, insights);
    }
  }

  private calculateDays(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays || 1;
  }

  private addDays(date: string, days: number): string {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result.toISOString().split('T')[0];
  }

  private generateCalculations(days: number, budget: string, travelers: string): any[] {
    const budgetMultiplier = budget === 'budget' ? 0.7 : budget === 'luxury' ? 1.5 : 1.0;
    const groupMultiplier = travelers === '5+' ? 1.2 : 1.0;
    const dailyBudget = Math.round(250 * budgetMultiplier * groupMultiplier);

    return [
      {
        type: "daily_budget_breakdown",
        totalDaily: dailyBudget,
        accommodation: Math.round(dailyBudget * 0.35),
        food: Math.round(dailyBudget * 0.30),
        activities: Math.round(dailyBudget * 0.25),
        transport: Math.round(dailyBudget * 0.10),
        days: days,
        totalTrip: dailyBudget * days
      },
      {
        type: "group_considerations",
        travelers: travelers,
        groupMultiplier: groupMultiplier,
        considerations: [
          "Group discounts for activities",
          "Shared accommodation costs",
          "Transportation efficiency for groups"
        ]
      }
    ];
  }

  // private generateBookingInfo(city: string, startDate: string, endDate: string, schedule: any[]): any {
  //   return {
  //     hotels: [
  //       {
  //         name: `Premium Hotel ${city}`,
  //         location: "City Center",
  //         checkIn: startDate,
  //         checkOut: endDate,
  //         pricePerNight: "$200-400",
  //         bookingDeadline: "2 weeks before travel",
  //         amenities: ["WiFi", "Breakfast", "Concierge", "Spa"]
  //       }
  //     ],
  //     flights: [
  //       {
  //         type: "International",
  //         departure: "Home Airport",
  //         arrival: `${city} Airport`,
  //         date: startDate,
  //         bookingDeadline: "1 month before travel",
  //         notes: "Book early for better prices"
  //       }
  //     ],
  //     activities: schedule?.flatMap(day => 
  //       day.activities?.filter((activity: any) => activity.bookingRequired)
  //         .map((activity: any) => ({
  //           name: activity.activity,
  //           place: activity.specificPlace,
  //           date: day.date,
  //           time: activity.time,
  //           cost: activity.cost,
  //           bookingRequired: true
  //         })) || []
  //     ) || [],
  //     restaurants: [
  //       {
  //         name: "Local Fine Dining",
  //         cuisine: "Local Specialty",
  //         priceRange: "$$$",
  //         reservationRequired: true,
  //         bookingDeadline: "1 week before"
  //       }
  //     ]
  //   };
  // }

  private async generateBookingInfo(
  city: string,
  startDate: string,
  endDate: string,
  schedule: any[]
): Promise<any> {
  // live look‑ups via Tavily
  return {
    hotels:      await fetchTopPlaces(city, 'hotel'),
    restaurants: await fetchTopPlaces(city, 'restaurant'),
    activities:  await fetchTopPlaces(city, 'activity'),

    // keep the existing flight stub so downstream code still works
    flights: [
      {
        type: 'International',
        departure: 'Home Airport',
        arrival: `${city} Airport`,
        date: startDate,
        bookingDeadline: '1 month before travel',
        notes: 'Book early for better prices'
      }
    ]
  };
}

  private async getMockItinerary(
    city: string,
    startDate: string,
    endDate: string,
    travelers: string,
    budget: string,
    insights: any[]
  ): Promise<TravelLogistics> {
    const days = this.calculateDays(startDate, endDate);
    const budgetMultiplier = budget === 'budget' ? 0.7 : budget === 'luxury' ? 1.5 : 1.0;
    const dailyBudget = Math.round(250 * budgetMultiplier);

    // Generate city-specific diverse itinerary
    const schedule: DaySchedule[] = this.generateCitySpecificItinerary(city, startDate, days, dailyBudget, insights);

    return {
      schedule,
      totalBudget: {
        amount: `$${dailyBudget * days}`,
        currency: "USD",
        breakdown: {
          accommodation: `$${Math.round(dailyBudget * 0.35 * days)} (35%)`,
          food: `$${Math.round(dailyBudget * 0.30 * days)} (30%)`,
          activities: `$${Math.round(dailyBudget * 0.25 * days)} (25%)`,
          transport: `$${Math.round(dailyBudget * 0.10 * days)} (10%)`,
          misc: `$${Math.round(dailyBudget * 0.05 * days)} (5%)`
        }
      },
      bookingInfo: await this.generateBookingInfo(city, startDate, endDate, schedule),
      calculations: this.generateCalculations(days, budget, travelers),
      logistics: {
        transportation: [
          `Purchase ${city} local transportation pass`,
          `Download ${city} transit app`,
          "Keep emergency taxi numbers handy",
          `Research ${city} airport transfer options`
        ],
        packing: [
          "Comfortable walking shoes",
          "Weather-appropriate clothing for the season",
          "Portable charger and local adapters",
          "Travel insurance documents",
          `Local currency for ${city}`
        ],
        documents: [
          "Valid passport (6+ months remaining)",
          "Travel insurance policy",
          "Hotel confirmation",
          "Emergency contact information",
          `Visa requirements for ${city} (if applicable)`
        ],
        emergency: {
          police: "Local emergency number",
          medical: "Local hospital contact",
          embassy: "Home country embassy contact"
        }
      },
      confidence: 0.92
    };
  }

  private generateCitySpecificItinerary(
    city: string,
    startDate: string,
    days: number,
    dailyBudget: number,
    insights: any[]
  ): DaySchedule[] {
    const cityLower = city.toLowerCase();
    
    // City-specific itineraries with real places and diverse activities
    if (cityLower.includes('barcelona')) {
      return this.generateBarcelonaItinerary(startDate, days, dailyBudget);
    } else if (cityLower.includes('tokyo')) {
      return this.generateTokyoItinerary(startDate, days, dailyBudget);
    } else if (cityLower.includes('bangkok')) {
      return this.generateBangkokItinerary(startDate, days, dailyBudget);
    } else if (cityLower.includes('prague')) {
      return this.generatePragueItinerary(startDate, days, dailyBudget);
    } else if (cityLower.includes('singapore')) {
      return this.generateSingaporeItinerary(startDate, days, dailyBudget);
    } else if (cityLower.includes('amsterdam')) {
      return this.generateAmsterdamItinerary(startDate, days, dailyBudget);
    }
    
    // Generic diverse itinerary for other cities
    return this.generateGenericDiverseItinerary(city, startDate, days, dailyBudget, insights);
  }

  private generateBarcelonaItinerary(startDate: string, days: number, dailyBudget: number): DaySchedule[] {
    const themes = [
      { title: "Gaudí's Architectural Wonders", theme: "Architecture & Art", neighborhoods: ["Eixample", "Gràcia"] },
      { title: "Gothic Quarter & Historic Barcelona", theme: "History & Culture", neighborhoods: ["Barrio Gótico", "El Born"] },
      { title: "Beach, Markets & Local Life", theme: "Local Life & Relaxation", neighborhoods: ["Barceloneta", "El Raval"] },
      { title: "Montjuïc & Panoramic Views", theme: "Nature & Views", neighborhoods: ["Montjuïc", "Poble Sec"] },
      { title: "Food Tour & Tapas Culture", theme: "Culinary Adventure", neighborhoods: ["Gràcia", "Sant Antoni"] }
    ];

    const activities = [
      // Day 1: Gaudí's Architecture
      [
        {
          time: "09:00",
          activity: "Sagrada Familia Guided Tour",
          type: "cultural" as const,
          specificPlace: "Basílica de la Sagrada Família",
          address: "Carrer de Mallorca, 401, 08013 Barcelona",
          description: "Gaudí's masterpiece basilica with intricate facades and stunning interior light play",
          duration: "2 hours",
          cost: "$35",
          bookingRequired: true,
          tips: ["Book skip-the-line tickets in advance", "Visit early to avoid crowds", "Audio guide highly recommended"],
          image: "https://images.pexels.com/photos/1388030/pexels-photo-1388030.jpeg?auto=compress&cs=tinysrgb&w=400"
        },
        {
          time: "12:00",
          activity: "Lunch at Casa Calvet Restaurant",
          type: "dining" as const,
          specificPlace: "Casa Calvet",
          address: "Carrer de Casp, 48, 08010 Barcelona",
          description: "Michelin-starred restaurant in a Gaudí-designed building serving modern Catalan cuisine",
          duration: "1.5 hours",
          cost: "$65",
          tips: ["Try the tasting menu", "Reservations essential", "Dress code: smart casual"]
        },
        {
          time: "15:00",
          activity: "Park Güell Exploration",
          type: "sightseeing" as const,
          specificPlace: "Park Güell",
          address: "Carrer d'Olot, s/n, 08024 Barcelona",
          description: "Whimsical park with colorful mosaics, unique architecture, and city views",
          duration: "2.5 hours",
          cost: "$15",
          bookingRequired: true,
          tips: ["Wear comfortable shoes", "Best photos at the mosaic bench", "Free areas available outside the monument zone"]
        },
        {
          time: "19:30",
          activity: "Sunset at Bunkers del Carmel",
          type: "leisure" as const,
          specificPlace: "Bunkers del Carmel",
          address: "Carrer de Marià Labèrnia, s/n, 08032 Barcelona",
          description: "Former anti-aircraft bunkers offering 360° panoramic views of Barcelona",
          duration: "1.5 hours",
          cost: "Free",
          tips: ["Bring water and snacks", "Arrive 30 minutes before sunset", "Can be crowded on weekends"]
        }
      ],
      // Day 2: Gothic Quarter
      [
        {
          time: "09:30",
          activity: "Barcelona Cathedral & Cloister",
          type: "cultural" as const,
          specificPlace: "Cathedral of the Holy Cross and Saint Eulalia",
          address: "Pla de la Seu, s/n, 08002 Barcelona",
          description: "Gothic cathedral with beautiful cloister, rooftop access, and 13 white geese",
          duration: "1.5 hours",
          cost: "$8",
          tips: ["Free entry during prayer times", "Rooftop offers great views", "Look for the 13 geese in the cloister"]
        },
        {
          time: "11:30",
          activity: "Picasso Museum Visit",
          type: "cultural" as const,
          specificPlace: "Museu Picasso",
          address: "Carrer Montcada, 15-23, 08003 Barcelona",
          description: "Extensive collection of Picasso's early works in beautiful medieval palaces",
          duration: "2 hours",
          cost: "$14",
          bookingRequired: true,
          tips: ["Free first Sunday of each month", "Audio guide available", "Photography not allowed"]
        },
        {
          time: "14:00",
          activity: "Lunch at Cal Pep Tapas Bar",
          type: "dining" as const,
          specificPlace: "Cal Pep",
          address: "Plaça de les Olles, 8, 08003 Barcelona",
          description: "Legendary tapas bar known for fresh seafood and standing-room-only atmosphere",
          duration: "1 hour",
          cost: "$45",
          tips: ["No reservations - arrive early", "Try the fried artichokes", "Cash only"]
        },
        {
          time: "16:00",
          activity: "El Born Cultural Center",
          type: "cultural" as const,
          specificPlace: "El Born Centre de Cultura i Memòria",
          address: "Plaça Comercial, 12, 08003 Barcelona",
          description: "Archaeological site and cultural center in a beautiful iron market building",
          duration: "1.5 hours",
          cost: "$6",
          tips: ["See the preserved medieval streets", "Free on Sundays after 3pm", "Interactive exhibits available"]
        },
        {
          time: "18:30",
          activity: "Cocktails at Paradiso",
          type: "leisure" as const,
          specificPlace: "Paradiso",
          address: "Carrer de Rera Palau, 4, 08003 Barcelona",
          description: "Hidden speakeasy behind a pastrami shop, world's 3rd best bar",
          duration: "2 hours",
          cost: "$18 per cocktail",
          bookingRequired: true,
          tips: ["Enter through the fridge door", "Reservations essential", "Try their signature cocktails"]
        }
      ],
      // Day 3: Beach & Markets
      [
        {
          time: "08:30",
          activity: "La Boquería Market Food Tour",
          type: "cultural" as const,
          specificPlace: "Mercat de la Boquería",
          address: "La Rambla, 91, 08001 Barcelona",
          description: "Famous food market with fresh produce, jamón, and local delicacies",
          duration: "2 hours",
          cost: "$25",
          tips: ["Avoid peak tourist hours", "Try fresh fruit juices", "Sample jamón ibérico"]
        },
        {
          time: "11:00",
          activity: "Beach Time at Barceloneta",
          type: "leisure" as const,
          specificPlace: "Platja de la Barceloneta",
          address: "Passeig Marítim de la Barceloneta, 08003 Barcelona",
          description: "Barcelona's most famous beach with golden sand and beach bars",
          duration: "3 hours",
          cost: "Free",
          tips: ["Rent umbrellas and chairs", "Watch for pickpockets", "Try paella at a chiringuito"]
        },
        {
          time: "14:30",
          activity: "Seafood Lunch at Can Majó",
          type: "dining" as const,
          specificPlace: "Can Majó",
          address: "Carrer de l'Almirall Aixada, 23, 08003 Barcelona",
          description: "Traditional seafood restaurant with beachfront terrace and excellent paella",
          duration: "1.5 hours",
          cost: "$55",
          tips: ["Try the black rice paella", "Reservations recommended", "Great sea views from terrace"]
        },
        {
          time: "17:00",
          activity: "Cable Car to Montjuïc",
          type: "transport" as const,
          specificPlace: "Telefèric de Montjuïc",
          address: "Avinguda Miramar, 30, 08038 Barcelona",
          description: "Scenic cable car ride offering spectacular views of the city and coastline",
          duration: "30 minutes",
          cost: "$13",
          tips: ["Best views on clear days", "Can be windy", "Combined tickets available"]
        },
        {
          time: "18:00",
          activity: "Magic Fountain Show",
          type: "leisure" as const,
          specificPlace: "Font Màgica de Montjuïc",
          address: "Plaça de Carles Buïgas, 1, 08038 Barcelona",
          description: "Spectacular water, light, and music show at the foot of Montjuïc",
          duration: "1 hour",
          cost: "Free",
          tips: ["Shows every 30 minutes", "Arrive early for good spots", "Bring a light jacket"]
        }
      ]
    ];

    return Array.from({ length: Math.min(days, themes.length) }, (_, i) => ({
      day: i + 1,
      date: this.addDays(startDate, i),
      title: themes[i].title,
      theme: themes[i].theme,
      activities: activities[i] || activities[0],
      dailyBudget: `$${dailyBudget}`,
      neighborhoods: themes[i].neighborhoods,
      highlights: activities[i]?.map(a => a.specificPlace) || [],
      notes: [
        "Comfortable walking shoes essential",
        "Many attractions offer student/senior discounts",
        "Siesta time: 2-5 PM many shops close",
        "Dinner typically starts after 9 PM"
      ]
    }));
  }

  private generateTokyoItinerary(startDate: string, days: number, dailyBudget: number): DaySchedule[] {
    const themes = [
      { title: "Traditional Tokyo: Temples & Gardens", theme: "Culture & Tradition", neighborhoods: ["Asakusa", "Ueno"] },
      { title: "Modern Tokyo: Shibuya & Harajuku", theme: "Modern Culture & Fashion", neighborhoods: ["Shibuya", "Harajuku"] },
      { title: "Tsukiji Market & Ginza Luxury", theme: "Food & Shopping", neighborhoods: ["Tsukiji", "Ginza"] },
      { title: "Otaku Culture: Akihabara & Anime", theme: "Pop Culture", neighborhoods: ["Akihabara", "Ikebukuro"] },
      { title: "Day Trip to Mount Fuji", theme: "Nature & Adventure", neighborhoods: ["Kawaguchi-ko", "Hakone"] }
    ];

    const activities = [
      // Day 1: Traditional Tokyo
      [
        {
          time: "08:00",
          activity: "Senso-ji Temple Morning Visit",
          type: "cultural" as const,
          specificPlace: "Senso-ji Temple",
          address: "2-3-1 Asakusa, Taito City, Tokyo 111-0032",
          description: "Tokyo's oldest temple with traditional architecture and bustling Nakamise shopping street",
          duration: "2 hours",
          cost: "Free",
          tips: ["Visit early to avoid crowds", "Try traditional snacks on Nakamise-dori", "Purify hands and mouth at the fountain"],
          image: "https://images.pexels.com/photos/2506923/pexels-photo-2506923.jpeg?auto=compress&cs=tinysrgb&w=400"
        },
        {
          time: "11:00",
          activity: "Traditional Breakfast at Daikokuya Tempura",
          type: "dining" as const,
          specificPlace: "Daikokuya Tempura",
          address: "1-38-10 Asakusa, Taito City, Tokyo 111-0032",
          description: "Historic tempura restaurant serving crispy tempura since 1887",
          duration: "1 hour",
          cost: "$35",
          tips: ["Try the tendon (tempura rice bowl)", "Cash only", "Popular with locals"]
        },
        {
          time: "13:00",
          activity: "Ueno Park & Tokyo National Museum",
          type: "cultural" as const,
          specificPlace: "Tokyo National Museum",
          address: "13-9 Uenokoen, Taito City, Tokyo 110-8712",
          description: "Japan's largest collection of cultural artifacts including samurai swords and Buddhist art",
          duration: "2.5 hours",
          cost: "$7",
          tips: ["Free on International Museum Day", "Beautiful cherry blossoms in spring", "Audio guide available"]
        },
        {
          time: "16:30",
          activity: "Traditional Tea Ceremony",
          type: "cultural" as const,
          specificPlace: "Urasenke Foundation",
          address: "Omotesenke Fushin-an, Kamigyo Ward, Kyoto",
          description: "Authentic tea ceremony experience learning the way of tea",
          duration: "1.5 hours",
          cost: "$45",
          bookingRequired: true,
          tips: ["Wear comfortable clothes", "Remove shoes", "Learn proper etiquette"]
        },
        {
          time: "19:00",
          activity: "Dinner in Omoide Yokocho",
          type: "dining" as const,
          specificPlace: "Omoide Yokocho (Memory Lane)",
          address: "1-2 Nishishinjuku, Shinjuku City, Tokyo 160-0023",
          description: "Narrow alleyways with tiny yakitori stalls and authentic atmosphere",
          duration: "2 hours",
          cost: "$40",
          tips: ["Very small spaces", "Cash only", "Try different stalls", "Bow when entering"]
        }
      ],
      // Day 2: Modern Tokyo
      [
        {
          time: "09:00",
          activity: "Shibuya Crossing Experience",
          type: "sightseeing" as const,
          specificPlace: "Shibuya Crossing",
          address: "Shibuya City, Tokyo 150-0043",
          description: "World's busiest pedestrian crossing with up to 3,000 people crossing at once",
          duration: "1 hour",
          cost: "Free",
          tips: ["Best view from Starbucks overlooking crossing", "Rush hours are most impressive", "Take photos from Sky observation deck"]
        },
        {
          time: "10:30",
          activity: "Harajuku Fashion District",
          type: "shopping" as const,
          specificPlace: "Takeshita Street",
          address: "Takeshita-dori, Shibuya City, Tokyo 150-0001",
          description: "Colorful street famous for youth fashion, cosplay, and quirky shops",
          duration: "2 hours",
          cost: "$30",
          tips: ["Try rainbow cotton candy", "Look for unique fashion items", "Street performers on weekends"]
        },
        {
          time: "13:00",
          activity: "Lunch at Kawaii Monster Cafe",
          type: "dining" as const,
          specificPlace: "Kawaii Monster Cafe",
          address: "4F YM Square Bldg, 4-31-10 Jingumae, Shibuya City, Tokyo",
          description: "Colorful themed cafe with monster decorations and Instagram-worthy food",
          duration: "1.5 hours",
          cost: "$25",
          bookingRequired: true,
          tips: ["Very colorful and loud", "Great for photos", "Unique themed dishes"]
        },
        {
          time: "15:30",
          activity: "Meiji Shrine Visit",
          type: "cultural" as const,
          specificPlace: "Meiji Shrine",
          address: "1-1 Kamizono-cho, Shibuya City, Tokyo 151-8557",
          description: "Peaceful Shinto shrine dedicated to Emperor Meiji, surrounded by forest",
          duration: "1.5 hours",
          cost: "Free",
          tips: ["Write wishes on ema wooden plaques", "Witness traditional wedding ceremonies", "Peaceful contrast to busy Harajuku"]
        },
        {
          time: "18:00",
          activity: "Robot Restaurant Show",
          type: "leisure" as const,
          specificPlace: "Robot Restaurant",
          address: "1-7-1 Kabukicho, Shinjuku City, Tokyo 160-0021",
          description: "Bizarre and entertaining robot show with lights, music, and mechanical mayhem",
          duration: "1.5 hours",
          cost: "$65",
          bookingRequired: true,
          tips: ["Very loud and flashy", "No actual restaurant", "Unique Tokyo experience"]
        }
      ]
    ];

    return Array.from({ length: Math.min(days, themes.length) }, (_, i) => ({
      day: i + 1,
      date: this.addDays(startDate, i),
      title: themes[i].title,
      theme: themes[i].theme,
      activities: activities[i] || activities[0],
      dailyBudget: `$${dailyBudget}`,
      neighborhoods: themes[i].neighborhoods,
      highlights: activities[i]?.map(a => a.specificPlace) || [],
      notes: [
        "JR Pass recommended for train travel",
        "Bow when greeting people",
        "Remove shoes when entering homes/temples",
        "Cash is still king in many places",
        "Download Google Translate with camera feature"
      ]
    }));
  }

  private generateBangkokItinerary(startDate: string, days: number, dailyBudget: number): DaySchedule[] {
    // Similar structure for Bangkok with specific places
    return this.generateGenericDiverseItinerary("Bangkok", startDate, days, dailyBudget, []);
  }

  private generatePragueItinerary(startDate: string, days: number, dailyBudget: number): DaySchedule[] {
    // Similar structure for Prague with specific places
    return this.generateGenericDiverseItinerary("Prague", startDate, days, dailyBudget, []);
  }

  private generateSingaporeItinerary(startDate: string, days: number, dailyBudget: number): DaySchedule[] {
    // Similar structure for Singapore with specific places
    return this.generateGenericDiverseItinerary("Singapore", startDate, days, dailyBudget, []);
  }

  private generateAmsterdamItinerary(startDate: string, days: number, dailyBudget: number): DaySchedule[] {
    // Similar structure for Amsterdam with specific places
    return this.generateGenericDiverseItinerary("Amsterdam", startDate, days, dailyBudget, []);
  }

  private generateGenericDiverseItinerary(
    city: string,
    startDate: string,
    days: number,
    dailyBudget: number,
    insights: any[]
  ): DaySchedule[] {
    const themes = [
      { title: `Historic ${city} Discovery`, theme: "History & Culture", neighborhoods: ["Old Town", "Historic District"] },
      { title: `${city} Food & Market Adventure`, theme: "Culinary Experience", neighborhoods: ["Market District", "Food Quarter"] },
      { title: `Art & Museums in ${city}`, theme: "Art & Culture", neighborhoods: ["Museum District", "Arts Quarter"] },
      { title: `Local Life in ${city}`, theme: "Local Experience", neighborhoods: ["Residential Areas", "Local Markets"] },
      { title: `Nature & Views around ${city}`, theme: "Nature & Relaxation", neighborhoods: ["Parks", "Scenic Areas"] }
    ];

    return Array.from({ length: Math.min(days, 5) }, (_, i) => ({
      day: i + 1,
      date: this.addDays(startDate, i),
      title: themes[i].title,
      theme: themes[i].theme,
      activities: [
        {
          time: "09:00",
          activity: `Morning ${themes[i].theme} Experience`,
          type: "cultural" as const,
          specificPlace: `${city} Main Attraction`,
          address: `Central ${city}`,
          description: `Explore the best of ${city}'s ${themes[i].theme.toLowerCase()}`,
          duration: "2.5 hours",
          cost: "$25",
          tips: ["Arrive early", "Bring camera", "Comfortable shoes recommended"]
        },
        {
          time: "12:30",
          activity: `Local ${city} Lunch`,
          type: "dining" as const,
          specificPlace: `Traditional ${city} Restaurant`,
          address: `${themes[i].neighborhoods[0]}`,
          description: `Authentic local cuisine in the heart of ${city}`,
          duration: "1.5 hours",
          cost: "$35",
          tips: ["Try local specialties", "Ask for recommendations"]
        },
        {
          time: "15:00",
          activity: `Afternoon ${city} Exploration`,
          type: "sightseeing" as const,
          specificPlace: `${city} Hidden Gem`,
          address: `${themes[i].neighborhoods[1]}`,
          description: `Discover lesser-known attractions and local favorites`,
          duration: "2 hours",
          cost: "$15",
          tips: ["Explore on foot", "Talk to locals", "Take your time"]
        },
        {
          time: "18:30",
          activity: `Evening ${city} Experience`,
          type: "leisure" as const,
          specificPlace: `${city} Evening Spot`,
          address: `City Center`,
          description: `End the day with a memorable ${city} experience`,
          duration: "2 hours",
          cost: "$30",
          tips: ["Perfect for sunset", "Bring layers", "Great photo opportunities"]
        }
      ],
      dailyBudget: `$${dailyBudget}`,
      neighborhoods: themes[i].neighborhoods,
      highlights: [`${city} Main Attraction`, `Traditional ${city} Restaurant`, `${city} Hidden Gem`],
      notes: [
        `Each day explores different aspects of ${city}`,
        "Comfortable walking shoes essential",
        "Try local transportation",
        "Learn basic local phrases"
      ]
    }));
  }
}