// lib/tools/tavily-wrapper.ts
import { TavilySearchTool } from './tavily-search'

export const fetchTopPlaces = async (
  city: string,
  kind: 'hotel' | 'restaurant' | 'activity',
  max = 5
) => {
  const tool = new TavilySearchTool()
  
  // Enhanced queries for better booking information
  const queries = {
    hotel: `${city} best hotels booking.com agoda expedia 2025 luxury mid-range`,
    restaurant: `${city} best restaurants opentable resy reservation 2025 michelin local`,
    activity: `${city} top attractions tickets booking viator getyourguide 2025`
  }
  
  const query = queries[kind] || `${city} ${kind} 2025`
  const { results } = await tool.search(query, { max_results: max })
  
  return results.map(({ title, url, content }) => {
    // Extract useful information and create proper booking links
    const name = title.replace(/^\d+\.\s*/, '').replace(/\s*-.*$/, '').trim()
    
    // Create booking-friendly URLs based on the type
    let bookingUrl = url
    if (kind === 'hotel') {
      if (url.includes('booking.com') || url.includes('agoda.com') || url.includes('expedia.com')) {
        bookingUrl = url
      } else {
        // Generate booking.com search URL
        const citySlug = city.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
        bookingUrl = `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(city)}&dest_type=city`
      }
    } else if (kind === 'restaurant') {
      if (url.includes('opentable.com') || url.includes('resy.com')) {
        bookingUrl = url
      } else {
        // Generate OpenTable search URL
        bookingUrl = `https://www.opentable.com/s?query=${encodeURIComponent(city)}`
      }
    } else if (kind === 'activity') {
      if (url.includes('viator.com') || url.includes('getyourguide.com') || url.includes('klook.com')) {
        bookingUrl = url
      } else {
        // Generate GetYourGuide search URL
        const citySlug = city.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
        bookingUrl = `https://www.getyourguide.com/s/?q=${encodeURIComponent(city)}`
      }
    }
    
    // Enhanced content processing
    const blurb = content
      .replace(/\d{4}-\d{2}-\d{2}.*?-/, '') // Remove dates
      .replace(/https?:\/\/[^\s]+/g, '') // Remove URLs
      .slice(0, 180)
      .trim()
    
    return {
      name,
      link: bookingUrl,
      blurb: blurb || `Top-rated ${kind} in ${city}. Click to view details and book.`,
      category: kind,
      city: city
    }
  })
}

// New function for flight booking information
export const fetchFlightOptions = async (
  origin: string,
  destination: string,
  departureDate: string,
  returnDate?: string
) => {
  const tool = new TavilySearchTool()
  const query = `flights ${origin} to ${destination} ${departureDate} booking skyscanner kayak expedia`
  const { results } = await tool.search(query, { max_results: 3 })
  
  const destinationCity = destination.split(',')[0] // Extract city name
  const originCity = origin || 'Your Location'
  
  return [
    {
      type: 'Round-trip' as const,
      departure: originCity,
      arrival: destinationCity,
      departureDate: departureDate,
      returnDate: returnDate || '',
      bookingLink: `https://www.skyscanner.com/routes/${originCity.toLowerCase().replace(/\s+/g, '-')}/${destinationCity.toLowerCase().replace(/\s+/g, '-')}`,
      notes: 'Compare prices across multiple airlines and booking sites',
      estimatedPrice: 'Price varies by season and booking time',
      tips: [
        'Book 6-8 weeks in advance for best prices',
        'Use incognito mode when searching',
        'Consider nearby airports for better deals'
      ]
    },
    {
      type: 'Alternative Route' as const,
      departure: originCity,
      arrival: destinationCity,
      departureDate: departureDate,
      returnDate: returnDate || '',
      bookingLink: `https://www.kayak.com/flights/${originCity}-${destinationCity}/${departureDate}${returnDate ? '/' + returnDate : ''}`,
      notes: 'Check for connecting flights that might be cheaper',
      estimatedPrice: 'Often 20-40% less than direct flights',
      tips: [
        'Consider longer layovers for lower prices',
        'Check if separate tickets are cheaper',
        'Look into budget airlines'
      ]
    }
  ]
}
