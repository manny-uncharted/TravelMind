// lib/tools/tavily-wrapper.ts
import { TavilySearchTool } from './tavily-search'

export const fetchTopPlaces = async (
  city: string,
  kind: 'hotel' | 'restaurant' | 'activity',
  max = 5
) => {
  const tool = new TavilySearchTool()
  const query =
    kind === 'hotel'
      ? `${city} best hotels 2025 city centre 4 star`
      : kind === 'restaurant'
      ? `${city} best restaurants 2025 local cuisine`
      : `${city} top things to do 2025`
  const { results } = await tool.search(query, { max_results: max })
  return results.map(({ title, url, content }) => ({
    name: title,
    link: url,
    blurb: content.slice(0, 160),
  }))
}
