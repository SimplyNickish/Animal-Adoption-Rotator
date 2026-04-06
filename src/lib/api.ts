export interface Animal {
  id: string;
  type: 'dog' | 'cat';
  dailyNumber: number;
  name: string;
  breed: string;
  age: string;
  location: string;
  shelter: string;
  url: string;
  pictures: string[];
  description?: string;
}

export async function fetchRescueGroups(apiKey: string, animalType: string, locationFilter: string, rotationSize: number): Promise<Animal[]> {
  if (!apiKey) {
    console.error("No RescueGroups API key provided.");
    return [];
  }

  let apiFilters: any[] = [];
  if (locationFilter) {
    const loc = locationFilter.trim();
    if (/^\d{5}$/.test(loc)) {
      apiFilters.push({ fieldName: "locations.postalcode", operation: "equals", criteria: loc });
    } else {
      apiFilters.push({ fieldName: "locations.citystate", operation: "contains", criteria: loc });
    }
  }

  const fetchOptions: RequestInit = {
    method: 'POST',
    headers: {
      'Authorization': apiKey,
      'Content-Type': 'application/vnd.api+json'
    },
    body: JSON.stringify({ data: { filters: apiFilters } })
  };

  const fetchType = async (endpoint: string, type: 'dog' | 'cat') => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      
      const response = await fetch(`https://api.rescuegroups.org/v5/public/animals/search/available/${endpoint}?include=pictures,orgs,locations,breeds&limit=${rotationSize}`, {
        ...fetchOptions,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      if (!response.ok) return [];
      const json = await response.json();
      const apiAnimals: Animal[] = [];

      if (json.data && Array.isArray(json.data)) {
        json.data.forEach((item: any, index: number) => {
          const name = item.attributes.name;
          const age = item.attributes.ageString || 'Unknown Age';
          const url = item.attributes.url;

          let breed = 'Mixed Breed';
          if (item.relationships?.breeds?.data?.length > 0) {
            const breedId = item.relationships.breeds.data[0].id;
            const breedObj = json.included?.find((inc: any) => inc.type === 'breeds' && inc.id === breedId);
            if (breedObj) breed = breedObj.attributes.name;
          }

          let location = 'Unknown Location';
          if (item.relationships?.locations?.data?.length > 0) {
            const locId = item.relationships.locations.data[0].id;
            const locObj = json.included?.find((inc: any) => inc.type === 'locations' && inc.id === locId);
            if (locObj) location = `${locObj.attributes.city}, ${locObj.attributes.state}`;
          }

          let shelter = 'Rescue';
          if (item.relationships?.orgs?.data?.length > 0) {
            const orgId = item.relationships.orgs.data[0].id;
            const orgObj = json.included?.find((inc: any) => inc.type === 'orgs' && inc.id === orgId);
            if (orgObj) shelter = orgObj.attributes.name;
          }

          let pictures: string[] = [];
          if (item.relationships?.pictures?.data?.length > 0) {
            item.relationships.pictures.data.forEach((picRef: any) => {
              const picObj = json.included?.find((inc: any) => inc.type === 'pictures' && inc.id === picRef.id);
              if (picObj && picObj.attributes.large?.url) {
                pictures.push(picObj.attributes.large.url);
              }
            });
          }

          if (pictures.length > 0) {
            apiAnimals.push({
              id: item.id,
              type,
              dailyNumber: 0,
              name,
              breed,
              age,
              location,
              shelter,
              url,
              pictures
            });
          }
        });
      }
      return apiAnimals;
    } catch (e) {
      console.error(e);
      return [];
    }
  };

  const promises: Promise<Animal[]>[] = [];
  if (animalType === 'dogs' || animalType === 'both') {
    promises.push(fetchType('dogs', 'dog'));
  }
  if (animalType === 'cats' || animalType === 'both') {
    promises.push(fetchType('cats', 'cat'));
  }
  
  const results = await Promise.all(promises);
  let fetchedAnimals: Animal[] = [];
  results.forEach(res => fetchedAnimals = fetchedAnimals.concat(res));
  
  return fetchedAnimals;
}

export async function fetchPetRescue(animalType: string): Promise<Animal[]> {
  try {
    const animals: Animal[] = [];
    
    const fetchWithTimeout = async (url: string, timeoutMs: number = 15000) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        return response;
      } catch (e) {
        clearTimeout(timeoutId);
        throw e;
      }
    };

    const fetchType = async (type: 'dog' | 'cat', urlPath: string) => {
      let htmlText = '';
      try {
        const proxyUrl = `https://cors.eu.org/https://www.petrescue.com.au/listings/${urlPath}`;
        const response = await fetchWithTimeout(proxyUrl, 15000);
        if (response.ok) {
          htmlText = await response.text();
        } else {
          throw new Error('proxy failed');
        }
      } catch (e) {
        console.error(`Proxy failed for PetRescue ${type}`, e);
        return;
      }
      
      if (!htmlText) return;

      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlText, 'text/html');
      
      doc.querySelectorAll('article').forEach((el, i) => {
        const name = el.querySelector('h3')?.textContent?.trim();
        let url = el.querySelector('a.cards-listings-preview__content')?.getAttribute('href');
        if (url && !url.startsWith('http')) {
          url = 'https://www.petrescue.com.au' + url;
        }
        let img = el.querySelector('img.cards-listings-preview__img')?.getAttribute('data-src') || el.querySelector('img.cards-listings-preview__img')?.getAttribute('src');
        if (img) img = img.replace('w_auto:100:500', 'w_600');
        
        const breed = el.querySelector('.cards-listings-preview__content__section__species')?.textContent?.trim().replace(/Dog|Cat/g, '').trim();
        const location = el.querySelector('.cards-listings-preview__content__section__location')?.textContent?.trim();
        
        if (name && url && img) {
          animals.push({
            id: `pr-${type}-${i}`,
            type,
            dailyNumber: 0,
            name: name || 'Unknown',
            breed: breed || 'Mixed Breed',
            age: 'Unknown Age',
            location: location || 'Australia',
            shelter: 'PetRescue',
            url: url,
            pictures: [img],
            description: `${breed} in ${location}`
          });
        }
      });
    };

    const promises = [];
    if (animalType === 'dogs' || animalType === 'both') {
      promises.push(fetchType('dog', 'dogs'));
    }
    if (animalType === 'cats' || animalType === 'both') {
      promises.push(fetchType('cat', 'cats'));
    }
    await Promise.all(promises);
    
    return animals;
  } catch (e) {
    console.error("PetRescue fetch error:", e);
    return [];
  }
}

export async function fetchRssFeed(url: string, sourceName: string, defaultLocation: string = 'Unknown Location', type: 'dog' | 'cat' = 'dog'): Promise<Animal[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    
    const proxyUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}`;
    const response = await fetch(proxyUrl, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (!response.ok) return [];
    const data = await response.json();
    if (data.status !== 'ok') return [];

    const imgRegex = /<img[^>]+src="([^">]+)"/i;
    
    return data.items.map((item: any, i: number) => {
      let img = item.thumbnail || (item.enclosure && item.enclosure.link);
      if (!img) {
        const match = (item.content || '').match(imgRegex) || (item.description || '').match(imgRegex);
        if (match) img = match[1];
      }

      return {
        id: `${sourceName}-${i}`,
        type,
        dailyNumber: 0,
        name: item.title || 'Unknown',
        breed: 'Mixed Breed',
        age: 'Unknown Age',
        location: defaultLocation,
        shelter: data.feed?.title || sourceName,
        url: item.link,
        pictures: img ? [img] : [],
        description: item.description || item.content || ''
      };
    }).filter((a: Animal) => a.pictures.length > 0);
  } catch (e) {
    console.error(`RSS fetch error for ${sourceName}:`, e);
    return [];
  }
}

const CACHE_KEY = 'animal_overlay_cache';
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

export async function fetchAllAnimals(
  animalType: string, 
  locationFilter: string, 
  rotationSize: number
): Promise<Animal[]> {
  const apiKey = process.env.NEXT_PUBLIC_RESCUE_GROUPS_API_KEY || '';
  const cacheId = `global_${animalType}_${locationFilter}_${rotationSize}_${apiKey}`;
  
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsedCache = JSON.parse(cached);
      if (parsedCache.id === cacheId && Date.now() - parsedCache.timestamp < CACHE_DURATION) {
        console.log("Loaded animals from cache");
        return parsedCache.data;
      }
    }
  } catch (e) {
    console.warn("Cache read error", e);
  }

  let fetchedAnimals: Animal[] = [];

  const promises: Promise<Animal[]>[] = [
    fetchPetRescue(animalType)
  ];

  if (animalType === 'dogs' || animalType === 'both') {
    promises.push(fetchRssFeed('https://www.dogsblog.com/feed/', 'dogsblog', 'UK', 'dog'));
  }

  if (apiKey) {
    promises.push(fetchRescueGroups(apiKey, animalType, locationFilter, rotationSize));
  }

  const results = await Promise.allSettled(promises);
  results.forEach(result => {
    if (result.status === 'fulfilled') {
      fetchedAnimals = fetchedAnimals.concat(result.value);
    }
  });

  // Filter by animalType
  if (animalType === 'dogs') {
    fetchedAnimals = fetchedAnimals.filter(a => a.type === 'dog');
  } else if (animalType === 'cats') {
    fetchedAnimals = fetchedAnimals.filter(a => a.type === 'cat');
  }

  // Filter by location (client-side)
  if (locationFilter) {
    const locLower = locationFilter.toLowerCase();
    fetchedAnimals = fetchedAnimals.filter(a => {
      const isRescueGroups = !a.id.startsWith('dogsblog-') && !a.id.startsWith('pr-');
      
      // If it's RescueGroups and the user typed a number (zip code), keep it (server-side filtered)
      if (isRescueGroups && /^\d+$/.test(locLower)) {
        return true;
      }
      
      // Otherwise, do a text match
      const locStr = a.location || '';
      const shelterStr = a.shelter || '';
      const descStr = a.description || '';
      return locStr.toLowerCase().includes(locLower) || 
             shelterStr.toLowerCase().includes(locLower) ||
             descStr.toLowerCase().includes(locLower);
    });
  }

  // Shuffle and slice to rotation size
  fetchedAnimals = fetchedAnimals.sort(() => Math.random() - 0.5).slice(0, rotationSize);

  // Assign daily numbers
  let dogCount = 1;
  let catCount = 1;
  fetchedAnimals.forEach(a => {
    if (a.type === 'dog') a.dailyNumber = dogCount++;
    else a.dailyNumber = catCount++;
  });

  try {
    if (fetchedAnimals.length > 0) {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        id: cacheId,
        timestamp: Date.now(),
        data: fetchedAnimals
      }));
    }
  } catch (e) {
    console.warn("Cache write error", e);
  }

  return fetchedAnimals;
}
