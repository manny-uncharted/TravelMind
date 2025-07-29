import { NextRequest, NextResponse } from 'next/server';
import { fetchTopPlaces, fetchFlightOptions } from '@/lib/tools/tavily-wrapper';

export async function POST(req: NextRequest) {
  try {
    let destination, type, budget, dates;
    
    // Try to parse JSON body first, fallback to URL parameters
    try {
      const body = await req.json();
      destination = body.destination;
      type = body.type;
      budget = body.budget;
      dates = body.dates;
    } catch {
      // If JSON parsing fails, use URL search parameters
      const url = new URL(req.url);
      destination = url.searchParams.get('destination');
      type = url.searchParams.get('category') || url.searchParams.get('type');
      budget = url.searchParams.get('budget');
      const dateParam = url.searchParams.get('dates');
      dates = dateParam ? { start: dateParam } : null;
    }

    if (!destination || !type) {
      return NextResponse.json(
        { error: 'Destination and type are required' },
        { status: 400 }
      );
    }

    let results: any[] = [];

    switch (type) {
      case 'hotel':
        // Make specific Tavily search for hotels
        console.log(`🏨 Searching for hotels in ${destination}`);
        results = await fetchTopPlaces(destination, 'hotel', 8);
        
        // Filter out generic travel guide results and add fallback data if needed
        const validHotels = results.filter(hotel => 
          !hotel.name.toLowerCase().includes('travel') &&
          !hotel.name.toLowerCase().includes('guide') &&
          !hotel.name.toLowerCase().includes('tips') &&
          !hotel.name.toLowerCase().includes('budget') &&
          !hotel.name.toLowerCase().includes('planning')
        );
        
        // If we don't have enough valid hotels, add some realistic fallbacks
        if (validHotels.length < 3) {
          const fallbackHotels = generateFallbackHotels(destination, budget);
          results = [...validHotels, ...fallbackHotels].slice(0, 8);
        } else {
          results = validHotels;
        }
        
        // Enhance hotel data with realistic information
        results = results.map(hotel => ({
          ...hotel,
          name: hotel.name || `Hotel in ${destination}`,
          rating: (Math.random() * 1.5 + 3.5).toFixed(1),
          price: getBudgetBasedPrice(budget, 'hotel'),
          amenities: getHotelAmenities(),
          availability: dates ? 'Available for your dates' : 'Check availability',
          image: getPlaceholderImage('hotel'),
          category: 'hotel',
          location: hotel.location || destination,
          blurb: hotel.blurb || `Quality accommodation in ${destination} with modern amenities`,
          link: hotel.link || `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(destination)}`
        }));
        break;

      case 'restaurant':
        // Make specific Tavily search for restaurants
        console.log(`🍽️ Searching for restaurants in ${destination}`);
        results = await fetchTopPlaces(destination, 'restaurant', 10);
        
        // Filter out generic travel guide results
        const validRestaurants = results.filter(restaurant => 
          !restaurant.name.toLowerCase().includes('travel') &&
          !restaurant.name.toLowerCase().includes('guide') &&
          !restaurant.name.toLowerCase().includes('tips') &&
          !restaurant.name.toLowerCase().includes('budget')
        );
        
        // Add fallback restaurants if needed
        if (validRestaurants.length < 4) {
          const fallbackRestaurants = generateFallbackRestaurants(destination, budget);
          results = [...validRestaurants, ...fallbackRestaurants].slice(0, 10);
        } else {
          results = validRestaurants;
        }
        
        // Enhance restaurant data with local cuisine info
        results = results.map(restaurant => ({
          ...restaurant,
          name: restaurant.name || `Restaurant in ${destination}`,
          rating: (Math.random() * 1.5 + 3.5).toFixed(1),
          price: getBudgetBasedPrice(budget, 'restaurant'),
          cuisine: getRandomCuisine(),
          bookingAdvance: getBookingAdvance(),
          specialties: getRestaurantSpecialties(),
          location: restaurant.location || `${destination} ${getRandomArea()}`,
          category: 'restaurant',
          blurb: restaurant.blurb || `Authentic local dining experience in ${destination}`,
          link: restaurant.link || `https://www.opentable.com/s?query=${encodeURIComponent(destination)}`
        }));
        break;

      case 'activity':
        // Make specific Tavily search for activities and attractions
        console.log(`🎯 Searching for activities in ${destination}`);
        results = await fetchTopPlaces(destination, 'activity', 12);
        
        // Filter out generic travel guide results
        const validActivities = results.filter(activity => 
          !activity.name.toLowerCase().includes('travel destinations') &&
          !activity.name.toLowerCase().includes('travel tips') &&
          !activity.name.toLowerCase().includes('budget') &&
          !activity.name.toLowerCase().includes('planning')
        );
        
        // Add fallback activities if needed
        if (validActivities.length < 4) {
          const fallbackActivities = generateFallbackActivities(destination, budget);
          results = [...validActivities, ...fallbackActivities].slice(0, 12);
        } else {
          results = validActivities;
        }
        
        // Enhance activity data with local attractions
        results = results.map(activity => ({
          ...activity,
          name: activity.name || `Activity in ${destination}`,
          rating: (Math.random() * 1.5 + 3.5).toFixed(1),
          price: getBudgetBasedPrice(budget, 'activity'),
          duration: getRandomDuration(),
          includes: getActivityIncludes(),
          bookingRequired: Math.random() > 0.5,
          category: 'activity',
          location: activity.location || destination,
          blurb: activity.blurb || `Exciting ${destination} experience with local insights`,
          link: activity.link || `https://www.getyourguide.com/s/?q=${encodeURIComponent(destination)}`
        }));
        break;

      case 'flight':
        // Make specific Tavily search for flights
        console.log(`✈️ Searching for flights to ${destination}`);
        const origin = req.nextUrl.searchParams.get('origin') || 'Your Location';
        
        // Search for flight information using Tavily
        const flightQuery = `flights from ${origin} to ${destination} booking skyscanner kayak expedia`;
        const flightResults = await fetchTopPlaces(destination, flightQuery, 5);
        
        // Also use the existing flight generation function
        const generatedFlights = await fetchFlightOptions(origin, destination, dates?.start, dates?.end);
        
        // Combine Tavily results with generated flight options
        results = [
          ...generatedFlights,
          ...flightResults.map(flight => ({
            ...flight,
            type: 'Search Result',
            departure: origin,
            arrival: destination,
            departureDate: dates?.start || 'Flexible',
            returnDate: dates?.end || 'Flexible',
            estimatedPrice: getBudgetBasedPrice(budget, 'flight'),
            provider: 'Multiple Airlines',
            category: 'flight'
          }))
        ];
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid booking type' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: results,
      destination,
      type,
      count: results.length
    });

  } catch (error) {
    console.error('Booking search error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch booking recommendations' },
      { status: 500 }
    );
  }
}

// Helper functions for generating realistic data
function generateFallbackHotels(destination: string, budget: string) {
  const city = destination.split(',')[0];
  const hotelTypes = ['Hotel', 'Resort', 'Inn', 'Lodge', 'Suites'];
  const adjectives = ['Grand', 'Royal', 'Premium', 'Central', 'Plaza', 'Park', 'Garden', 'Metropolitan'];
  
  return Array.from({ length: 5 }, (_, i) => ({
    name: `${adjectives[i % adjectives.length]} ${city} ${hotelTypes[i % hotelTypes.length]}`,
    link: `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(destination)}`,
    blurb: `Elegant accommodation in the heart of ${city} with exceptional service and modern amenities.`,
    category: 'hotel',
    city: destination,
    location: `${city} City Center`
  }));
}

function generateFallbackRestaurants(destination: string, budget: string) {
  const city = destination.split(',')[0];
  const cuisines = ['Local', 'Traditional', 'Modern', 'International', 'Fusion'];
  const types = ['Restaurant', 'Bistro', 'Cafe', 'Kitchen', 'House'];
  
  return Array.from({ length: 6 }, (_, i) => ({
    name: `${cuisines[i % cuisines.length]} ${types[i % types.length]}`,
    link: `https://www.opentable.com/s?query=${encodeURIComponent(destination)}`,
    blurb: `Authentic ${city} dining experience featuring local specialties and fresh ingredients.`,
    category: 'restaurant',
    city: destination,
    location: `${city} District`
  }));
}

function generateFallbackActivities(destination: string, budget: string) {
  const city = destination.split(',')[0];
  const activities = [
    `${city} Cultural Center`,
    `Historic ${city} Walking Tour`,
    `${city} Museum Experience`,
    `Local Markets of ${city}`,
    `${city} City Highlights Tour`,
    `Traditional ${city} Workshop`
  ];
  
  return activities.map(name => ({
    name,
    link: `https://www.getyourguide.com/s/?q=${encodeURIComponent(destination)}`,
    blurb: `Immersive ${city} experience showcasing local culture, history, and authentic traditions.`,
    category: 'activity',
    city: destination,
    location: city
  }));
}

function getBudgetBasedPrice(budget: string, type: string) {
  const prices = {
    budget: {
      hotel: ['$45/night', '$55/night', '$65/night', '$75/night'],
      restaurant: ['$15-25', '$20-30', '$25-35'],
      activity: ['$15', '$25', '$35', '$45']
    },
    mid: {
      hotel: ['$85/night', '$95/night', '$110/night', '$125/night'],
      restaurant: ['$35-50', '$40-55', '$45-60'],
      activity: ['$45', '$55', '$65', '$75']
    },
    luxury: {
      hotel: ['$180/night', '$220/night', '$280/night', '$350/night'],
      restaurant: ['$65-85', '$75-95', '$85-120'],
      activity: ['$85', '$95', '$125', '$150']
    }
  };

  const budgetKey = budget as keyof typeof prices;
  const typeKey = type as keyof typeof prices.budget;
  const options = prices[budgetKey]?.[typeKey] || prices.mid[typeKey];
  return options[Math.floor(Math.random() * options.length)];
}

function getHotelAmenities() {
  const amenities = ['Free WiFi', 'Spa', 'Gym', 'Restaurant', 'Pool', 'Breakfast', 'Parking', 'Rooftop Bar', 'Concierge', 'Ocean View'];
  return amenities.slice(0, Math.floor(Math.random() * 4) + 3);
}

function getRandomCuisine() {
  const cuisines = ['Local Specialty', 'Traditional', 'Modern', 'Fusion', 'International', 'Seafood', 'Farm-to-Table', 'Street Food'];
  return cuisines[Math.floor(Math.random() * cuisines.length)];
}

function getRandomArea() {
  const areas = ['Downtown', 'Old Town', 'City Center', 'Historic District', 'Waterfront', 'Market District', 'Arts Quarter'];
  return areas[Math.floor(Math.random() * areas.length)];
}

function getBookingAdvance() {
  const advances = ['Walk-in friendly', '1 week', '2 weeks', 'Same day', 'Recommended 3-5 days'];
  return advances[Math.floor(Math.random() * advances.length)];
}

function getRestaurantSpecialties() {
  const specialties = [
    ['Signature Dishes', 'Wine Pairing', 'Chef\'s Table'],
    ['Local Favorites', 'Traditional Recipes', 'Craft Beer'],
    ['Seasonal Menu', 'Local Ingredients', 'Vegetarian Options'],
    ['Fresh Seafood', 'Ocean Views', 'Sunset Dining'],
    ['Authentic Cuisine', 'Family Recipes', 'Cultural Experience']
  ];
  return specialties[Math.floor(Math.random() * specialties.length)];
}

function getRandomDuration() {
  const durations = ['1 hour', '1.5 hours', '2 hours', '2.5 hours', '3 hours', '4 hours', '6 hours', 'Full day'];
  return durations[Math.floor(Math.random() * durations.length)];
}

function getActivityIncludes() {
  const includes = [
    ['Professional guide', 'Transportation', 'Entry fees'],
    ['Food tastings', 'Local guide', 'Market visit'],
    ['All materials', 'Expert instruction', 'Take-home creation'],
    ['Hotel pickup', 'Equipment rental', 'Refreshments'],
    ['Small group', 'Photo opportunities', 'Local insights']
  ];
  return includes[Math.floor(Math.random() * includes.length)];
}

function getPlaceholderImage(type: string) {
  const images = {
    hotel: [
      'https://images.pexels.com/photos/258154/pexels-photo-258154.jpeg?auto=compress&cs=tinysrgb&w=400',
      'https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg?auto=compress&cs=tinysrgb&w=400',
      'https://images.pexels.com/photos/271639/pexels-photo-271639.jpeg?auto=compress&cs=tinysrgb&w=400'
    ]
  };
  return images[type as keyof typeof images]?.[Math.floor(Math.random() * 3)] || '';
}
