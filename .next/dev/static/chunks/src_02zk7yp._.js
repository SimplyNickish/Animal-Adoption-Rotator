(globalThis["TURBOPACK"] || (globalThis["TURBOPACK"] = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/src/lib/api.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "fetchAllAnimals",
    ()=>fetchAllAnimals,
    "fetchPetRescue",
    ()=>fetchPetRescue,
    "fetchRescueGroups",
    ()=>fetchRescueGroups,
    "fetchRssFeed",
    ()=>fetchRssFeed
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
async function fetchRescueGroups(apiKey, animalType, locationFilter, rotationSize) {
    if (!apiKey) {
        console.error("No RescueGroups API key provided.");
        return [];
    }
    let apiFilters = [];
    if (locationFilter) {
        const loc = locationFilter.trim();
        if (/^\d{5}$/.test(loc)) {
            apiFilters.push({
                fieldName: "locations.postalcode",
                operation: "equals",
                criteria: loc
            });
        } else {
            apiFilters.push({
                fieldName: "locations.citystate",
                operation: "contains",
                criteria: loc
            });
        }
    }
    const fetchOptions = {
        method: 'POST',
        headers: {
            'Authorization': apiKey,
            'Content-Type': 'application/vnd.api+json'
        },
        body: JSON.stringify({
            data: {
                filters: apiFilters
            }
        })
    };
    const fetchType = async (endpoint, type)=>{
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(()=>controller.abort(), 8000);
            const response = await fetch(`https://api.rescuegroups.org/v5/public/animals/search/available/${endpoint}?include=pictures,orgs,locations,breeds&limit=${rotationSize}`, {
                ...fetchOptions,
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            if (!response.ok) return [];
            const json = await response.json();
            const apiAnimals = [];
            if (json.data && Array.isArray(json.data)) {
                json.data.forEach((item, index)=>{
                    const name = item.attributes.name;
                    const age = item.attributes.ageString || 'Unknown Age';
                    const url = item.attributes.url;
                    let breed = 'Mixed Breed';
                    if (item.relationships?.breeds?.data?.length > 0) {
                        const breedId = item.relationships.breeds.data[0].id;
                        const breedObj = json.included?.find((inc)=>inc.type === 'breeds' && inc.id === breedId);
                        if (breedObj) breed = breedObj.attributes.name;
                    }
                    let location = 'Unknown Location';
                    if (item.relationships?.locations?.data?.length > 0) {
                        const locId = item.relationships.locations.data[0].id;
                        const locObj = json.included?.find((inc)=>inc.type === 'locations' && inc.id === locId);
                        if (locObj) location = `${locObj.attributes.city}, ${locObj.attributes.state}`;
                    }
                    let shelter = 'Rescue';
                    if (item.relationships?.orgs?.data?.length > 0) {
                        const orgId = item.relationships.orgs.data[0].id;
                        const orgObj = json.included?.find((inc)=>inc.type === 'orgs' && inc.id === orgId);
                        if (orgObj) shelter = orgObj.attributes.name;
                    }
                    let pictures = [];
                    if (item.relationships?.pictures?.data?.length > 0) {
                        item.relationships.pictures.data.forEach((picRef)=>{
                            const picObj = json.included?.find((inc)=>inc.type === 'pictures' && inc.id === picRef.id);
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
    const promises = [];
    if (animalType === 'dogs' || animalType === 'both') {
        promises.push(fetchType('dogs', 'dog'));
    }
    if (animalType === 'cats' || animalType === 'both') {
        promises.push(fetchType('cats', 'cat'));
    }
    const results = await Promise.all(promises);
    let fetchedAnimals = [];
    results.forEach((res)=>fetchedAnimals = fetchedAnimals.concat(res));
    return fetchedAnimals;
}
async function fetchPetRescue(animalType) {
    try {
        const animals = [];
        const fetchWithTimeout = async (url, timeoutMs = 15000)=>{
            const controller = new AbortController();
            const timeoutId = setTimeout(()=>controller.abort(), timeoutMs);
            try {
                const response = await fetch(url, {
                    signal: controller.signal
                });
                clearTimeout(timeoutId);
                return response;
            } catch (e) {
                clearTimeout(timeoutId);
                throw e;
            }
        };
        const fetchType = async (type, urlPath)=>{
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
            doc.querySelectorAll('article').forEach((el, i)=>{
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
                        pictures: [
                            img
                        ],
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
async function fetchRssFeed(url, sourceName, defaultLocation = 'Unknown Location', type = 'dog') {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(()=>controller.abort(), 8000);
        const proxyUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}`;
        const response = await fetch(proxyUrl, {
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (!response.ok) return [];
        const data = await response.json();
        if (data.status !== 'ok') return [];
        const imgRegex = /<img[^>]+src="([^">]+)"/i;
        return data.items.map((item, i)=>{
            let img = item.thumbnail || item.enclosure && item.enclosure.link;
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
                pictures: img ? [
                    img
                ] : [],
                description: item.description || item.content || ''
            };
        }).filter((a)=>a.pictures.length > 0);
    } catch (e) {
        console.error(`RSS fetch error for ${sourceName}:`, e);
        return [];
    }
}
const CACHE_KEY = 'animal_overlay_cache';
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour
async function fetchAllAnimals(animalType, locationFilter, rotationSize) {
    const apiKey = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].env.NEXT_PUBLIC_RESCUE_GROUPS_API_KEY || '';
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
    let fetchedAnimals = [];
    const promises = [
        fetchPetRescue(animalType)
    ];
    if (animalType === 'dogs' || animalType === 'both') {
        promises.push(fetchRssFeed('https://www.dogsblog.com/feed/', 'dogsblog', 'UK', 'dog'));
    }
    if (apiKey) {
        promises.push(fetchRescueGroups(apiKey, animalType, locationFilter, rotationSize));
    }
    const results = await Promise.allSettled(promises);
    results.forEach((result)=>{
        if (result.status === 'fulfilled') {
            fetchedAnimals = fetchedAnimals.concat(result.value);
        }
    });
    // Filter by animalType
    if (animalType === 'dogs') {
        fetchedAnimals = fetchedAnimals.filter((a)=>a.type === 'dog');
    } else if (animalType === 'cats') {
        fetchedAnimals = fetchedAnimals.filter((a)=>a.type === 'cat');
    }
    // Filter by location (client-side)
    if (locationFilter) {
        const locLower = locationFilter.toLowerCase();
        fetchedAnimals = fetchedAnimals.filter((a)=>{
            const isRescueGroups = !a.id.startsWith('dogsblog-') && !a.id.startsWith('pr-');
            // If it's RescueGroups and the user typed a number (zip code), keep it (server-side filtered)
            if (isRescueGroups && /^\d+$/.test(locLower)) {
                return true;
            }
            // Otherwise, do a text match
            const locStr = a.location || '';
            const shelterStr = a.shelter || '';
            const descStr = a.description || '';
            return locStr.toLowerCase().includes(locLower) || shelterStr.toLowerCase().includes(locLower) || descStr.toLowerCase().includes(locLower);
        });
    }
    // Shuffle and slice to rotation size
    fetchedAnimals = fetchedAnimals.sort(()=>Math.random() - 0.5).slice(0, rotationSize);
    // Assign daily numbers
    let dogCount = 1;
    let catCount = 1;
    fetchedAnimals.forEach((a)=>{
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
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/Overlay.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>AppWrapper
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$qrcode$2e$react$2f$lib$2f$esm$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/qrcode.react/lib/esm/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/framer-motion/dist/es/render/components/motion/proxy.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$components$2f$AnimatePresence$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/framer-motion/dist/es/components/AnimatePresence/index.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$map$2d$pin$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__MapPin$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/map-pin.js [app-client] (ecmascript) <export default as MapPin>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$heart$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Heart$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/heart.js [app-client] (ecmascript) <export default as Heart>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$info$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Info$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/info.js [app-client] (ecmascript) <export default as Info>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$sparkles$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Sparkles$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/sparkles.js [app-client] (ecmascript) <export default as Sparkles>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$settings$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Settings$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/settings.js [app-client] (ecmascript) <export default as Settings>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/x.js [app-client] (ecmascript) <export default as X>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$search$2d$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__SearchX$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/search-x.js [app-client] (ecmascript) <export default as SearchX>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$message$2d$square$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__MessageSquare$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/message-square.js [app-client] (ecmascript) <export default as MessageSquare>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$triangle$2d$alert$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertTriangle$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/triangle-alert.js [app-client] (ecmascript) <export default as AlertTriangle>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$tmi$2e$js$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/tmi.js/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/api.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
;
;
;
class ErrorBoundary extends __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].Component {
    state = {
        hasError: false,
        error: null
    };
    constructor(props){
        super(props);
    }
    static getDerivedStateFromError(error) {
        return {
            hasError: true,
            error
        };
    }
    componentDidCatch(error, errorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }
    render() {
        if (this.state.hasError) {
            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "w-screen h-screen flex flex-col items-center justify-center bg-slate-900 text-white p-8",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$triangle$2d$alert$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertTriangle$3e$__["AlertTriangle"], {
                        className: "w-16 h-16 text-red-500 mb-4"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Overlay.tsx",
                        lineNumber: 37,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                        className: "text-2xl font-bold mb-2",
                        children: "Something went wrong"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Overlay.tsx",
                        lineNumber: 38,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-slate-400 mb-4 text-center max-w-md",
                        children: "The overlay encountered an error. Please check your settings or refresh the page."
                    }, void 0, false, {
                        fileName: "[project]/src/components/Overlay.tsx",
                        lineNumber: 39,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("pre", {
                        className: "bg-black/50 p-4 rounded-lg text-sm text-red-400 max-w-2xl overflow-auto",
                        children: this.state.error?.message
                    }, void 0, false, {
                        fileName: "[project]/src/components/Overlay.tsx",
                        lineNumber: 42,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: ()=>window.location.reload(),
                        className: "mt-6 px-6 py-2 bg-emerald-500 text-black font-bold rounded-xl hover:bg-emerald-400 transition-colors",
                        children: "Reload Overlay"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Overlay.tsx",
                        lineNumber: 45,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/Overlay.tsx",
                lineNumber: 36,
                columnNumber: 9
            }, this);
        }
        return this.props.children;
    }
}
function AppWrapper() {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(ErrorBoundary, {
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(App, {}, void 0, false, {
            fileName: "[project]/src/components/Overlay.tsx",
            lineNumber: 62,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/src/components/Overlay.tsx",
        lineNumber: 61,
        columnNumber: 5
    }, this);
}
_c = AppWrapper;
function App() {
    _s();
    const [animals, setAnimals] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [currentIndex, setCurrentIndex] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(0);
    const currentAnimal = animals[currentIndex] || null;
    const nextAnimal = animals[(currentIndex + 1) % animals.length] || null;
    const [pictureIndex, setPictureIndex] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(0);
    const [noAnimalsFound, setNoAnimalsFound] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [isLoading, setIsLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const [isSettingsOpen, setIsSettingsOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    // Settings State
    const [locationInput, setLocationInput] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [animalTypeInput, setAnimalTypeInput] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('both');
    const [displayDurationInput, setDisplayDurationInput] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('60');
    const [rotationSizeInput, setRotationSizeInput] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('50');
    const [twitchChannelInput, setTwitchChannelInput] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [twitchBotUsernameInput, setTwitchBotUsernameInput] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [twitchBotTokenInput, setTwitchBotTokenInput] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [botIntegrationInput, setBotIntegrationInput] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('none');
    const [streamerbotUrlInput, setStreamerbotUrlInput] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('ws://127.0.0.1:8080/');
    // Active Settings (applied)
    const [activeLocation, setActiveLocation] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [activeAnimalType, setActiveAnimalType] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('both');
    const [activeDisplayDuration, setActiveDisplayDuration] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(60);
    const [activeRotationSize, setActiveRotationSize] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(50);
    const [activeTwitchChannel, setActiveTwitchChannel] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [activeTwitchBotUsername, setActiveTwitchBotUsername] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [activeTwitchBotToken, setActiveTwitchBotToken] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [activeBotIntegration, setActiveBotIntegration] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('none');
    const [activeStreamerbotUrl, setActiveStreamerbotUrl] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('ws://127.0.0.1:8080/');
    const twitchClientRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const sbWsRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const animalsRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(animals);
    const currentIndexRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(currentIndex);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "App.useEffect": ()=>{
            animalsRef.current = animals;
        }
    }["App.useEffect"], [
        animals
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "App.useEffect": ()=>{
            currentIndexRef.current = currentIndex;
        }
    }["App.useEffect"], [
        currentIndex
    ]);
    // Initialize from URL or LocalStorage
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "App.useEffect": ()=>{
            const searchParams = new URLSearchParams(window.location.search);
            const getVal = {
                "App.useEffect.getVal": (key, defaultVal)=>{
                    const urlVal = searchParams.get(key);
                    if (urlVal !== null) return urlVal;
                    const lsVal = localStorage.getItem(`pet_overlay_${key}`);
                    if (lsVal !== null) return lsVal;
                    return defaultVal;
                }
            }["App.useEffect.getVal"];
            const loc = getVal('location', '');
            const type = getVal('animalType', 'both');
            const durationRaw = parseInt(getVal('displayDuration', '60'));
            const duration = isNaN(durationRaw) || durationRaw < 10 ? 60 : durationRaw;
            const limitRaw = parseInt(getVal('rotationSize', '50'));
            const limit = isNaN(limitRaw) || limitRaw < 1 ? 50 : limitRaw;
            const twitch = getVal('twitchChannel', '');
            const botUser = getVal('twitchBotUsername', '');
            const botToken = getVal('twitchBotToken', '');
            const botInt = getVal('botIntegration', 'none');
            const sbUrl = getVal('streamerbotUrl', 'ws://127.0.0.1:8080/');
            setLocationInput(loc);
            setActiveLocation(loc);
            setAnimalTypeInput(type);
            setActiveAnimalType(type);
            setDisplayDurationInput(duration.toString());
            setActiveDisplayDuration(duration);
            setRotationSizeInput(limit.toString());
            setActiveRotationSize(limit);
            setTwitchChannelInput(twitch);
            setActiveTwitchChannel(twitch);
            setTwitchBotUsernameInput(botUser);
            setActiveTwitchBotUsername(botUser);
            setTwitchBotTokenInput(botToken);
            setActiveTwitchBotToken(botToken);
            setBotIntegrationInput(botInt);
            setActiveBotIntegration(botInt);
            setStreamerbotUrlInput(sbUrl);
            setActiveStreamerbotUrl(sbUrl);
        }
    }["App.useEffect"], []);
    // Update URL when any active setting changes
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "App.useEffect": ()=>{
            const searchParams = new URLSearchParams();
            if (activeLocation) searchParams.set('location', activeLocation);
            searchParams.set('animalType', activeAnimalType);
            searchParams.set('displayDuration', activeDisplayDuration.toString());
            searchParams.set('rotationSize', activeRotationSize.toString());
            if (activeTwitchChannel) searchParams.set('twitchChannel', activeTwitchChannel.replace('#', '').trim());
            if (activeTwitchBotUsername) searchParams.set('twitchBotUsername', activeTwitchBotUsername.trim());
            if (activeTwitchBotToken) searchParams.set('twitchBotToken', activeTwitchBotToken.trim());
            if (activeBotIntegration !== 'none') searchParams.set('botIntegration', activeBotIntegration);
            if (activeStreamerbotUrl !== 'ws://127.0.0.1:8080/') searchParams.set('streamerbotUrl', activeStreamerbotUrl.trim());
            // Update URL so it can be copied if needed
            const newUrl = window.location.pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '');
            window.history.replaceState({}, '', newUrl);
        }
    }["App.useEffect"], [
        activeLocation,
        activeAnimalType,
        activeDisplayDuration,
        activeRotationSize,
        activeTwitchChannel,
        activeTwitchBotUsername,
        activeTwitchBotToken,
        activeBotIntegration,
        activeStreamerbotUrl
    ]);
    // Fetch Animals
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "App.useEffect": ()=>{
            let isMounted = true;
            setIsLoading(true);
            setNoAnimalsFound(false);
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["fetchAllAnimals"])(activeAnimalType, activeLocation, activeRotationSize).then({
                "App.useEffect": (fetchedAnimals)=>{
                    if (!isMounted) return;
                    if (fetchedAnimals.length === 0) {
                        setAnimals([]);
                        setNoAnimalsFound(true);
                    } else {
                        setAnimals(fetchedAnimals);
                        setCurrentIndex(0);
                        setPictureIndex(0);
                        setNoAnimalsFound(false);
                    }
                    setIsLoading(false);
                }
            }["App.useEffect"]).catch({
                "App.useEffect": (e)=>{
                    if (!isMounted) return;
                    console.error(e);
                    setAnimals([]);
                    setNoAnimalsFound(true);
                    setIsLoading(false);
                }
            }["App.useEffect"]);
            return ({
                "App.useEffect": ()=>{
                    isMounted = false;
                }
            })["App.useEffect"];
        }
    }["App.useEffect"], [
        activeLocation,
        activeAnimalType,
        activeRotationSize
    ]);
    // Rotation Timer
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "App.useEffect": ()=>{
            if (animals.length <= 1) return;
            const timer = setInterval({
                "App.useEffect.timer": ()=>{
                    setCurrentIndex({
                        "App.useEffect.timer": (prev)=>(prev + 1) % animals.length
                    }["App.useEffect.timer"]);
                    setPictureIndex(0);
                }
            }["App.useEffect.timer"], activeDisplayDuration * 1000);
            return ({
                "App.useEffect": ()=>clearInterval(timer)
            })["App.useEffect"];
        }
    }["App.useEffect"], [
        animals,
        activeDisplayDuration
    ]);
    // Streamer.bot Connection
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "App.useEffect": ()=>{
            if (activeBotIntegration === 'streamerbot' && activeStreamerbotUrl) {
                const ws = new WebSocket(activeStreamerbotUrl);
                ws.onopen = ({
                    "App.useEffect": ()=>{
                        console.log('Connected to Streamer.bot');
                    }
                })["App.useEffect"];
                ws.onerror = ({
                    "App.useEffect": (e)=>{
                        console.error('Streamer.bot WebSocket error', e);
                    }
                })["App.useEffect"];
                sbWsRef.current = ws;
                return ({
                    "App.useEffect": ()=>{
                        ws.close();
                        sbWsRef.current = null;
                    }
                })["App.useEffect"];
            }
        }
    }["App.useEffect"], [
        activeBotIntegration,
        activeStreamerbotUrl
    ]);
    // Twitch Connection
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "App.useEffect": ()=>{
            if (!activeTwitchChannel) {
                if (twitchClientRef.current) {
                    twitchClientRef.current.disconnect();
                    twitchClientRef.current = null;
                }
                return;
            }
            const channel = activeTwitchChannel.replace('#', '').trim().toLowerCase();
            const clientOptions = {
                channels: [
                    `#${channel}`
                ]
            };
            if (activeBotIntegration === 'twitch' && activeTwitchBotUsername && activeTwitchBotToken) {
                clientOptions.identity = {
                    username: activeTwitchBotUsername,
                    password: activeTwitchBotToken
                };
            }
            const client = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$tmi$2e$js$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].Client(clientOptions);
            client.connect().catch(console.error);
            twitchClientRef.current = client;
            client.on('message', {
                "App.useEffect": (ch, tags, message, self)=>{
                    if (self) return;
                    const msg = message.toLowerCase().trim();
                    if (msg.startsWith('!adopt') || msg.startsWith('!dog') || msg.startsWith('!cat')) {
                        const parts = msg.split(' ');
                        const cmd = parts[0];
                        const numStr = parts[1];
                        const num = numStr ? parseInt(numStr) : null;
                        let targetAnimal;
                        const currentAnimals = animalsRef.current;
                        const currentIdx = currentIndexRef.current;
                        if (cmd === '!adopt') {
                            if (num) {
                                targetAnimal = currentAnimals.find({
                                    "App.useEffect": (a)=>a.dailyNumber === num
                                }["App.useEffect"]);
                            } else {
                                targetAnimal = currentAnimals[currentIdx];
                            }
                        } else {
                            const targetType = cmd === '!dog' ? 'dog' : 'cat';
                            if (num) {
                                targetAnimal = currentAnimals.find({
                                    "App.useEffect": (a)=>a.type === targetType && a.dailyNumber === num
                                }["App.useEffect"]);
                            } else {
                                targetAnimal = currentAnimals[currentIdx];
                                if (targetAnimal?.type !== targetType) {
                                    targetAnimal = currentAnimals.find({
                                        "App.useEffect": (a)=>a.type === targetType
                                    }["App.useEffect"]);
                                }
                            }
                        }
                        const sendReply = {
                            "App.useEffect.sendReply": (replyMessage)=>{
                                if (activeBotIntegration === 'streamerbot' && sbWsRef.current?.readyState === WebSocket.OPEN) {
                                    sbWsRef.current.send(JSON.stringify({
                                        request: "SendMessage",
                                        platform: "twitch",
                                        message: replyMessage,
                                        id: `msg_${Date.now()}`
                                    }));
                                } else if (activeBotIntegration === 'twitch') {
                                    client.say(ch, replyMessage).catch({
                                        "App.useEffect.sendReply": (e)=>{
                                            console.warn('Could not send Twitch message (bot not authenticated)', e);
                                        }
                                    }["App.useEffect.sendReply"]);
                                }
                            }
                        }["App.useEffect.sendReply"];
                        if (targetAnimal) {
                            // Update the overlay to show the requested animal
                            const newIndex = currentAnimals.findIndex({
                                "App.useEffect.newIndex": (a)=>a.id === targetAnimal.id
                            }["App.useEffect.newIndex"]);
                            if (newIndex !== -1) {
                                setCurrentIndex(newIndex);
                                setPictureIndex(0);
                            }
                            const typeLabel = targetAnimal.type === 'dog' ? 'Dog' : 'Cat';
                            sendReply(`Meet ${targetAnimal.name} (${typeLabel} #${targetAnimal.dailyNumber})! Adopt here: ${targetAnimal.url}`);
                        } else {
                            const targetType = cmd === '!dog' ? 'dog' : cmd === '!cat' ? 'cat' : 'animal';
                            sendReply(`Couldn't find ${targetType} #${num || 'currently'}.`);
                        }
                    }
                }
            }["App.useEffect"]);
            return ({
                "App.useEffect": ()=>{
                    client.disconnect();
                    twitchClientRef.current = null;
                }
            })["App.useEffect"];
        }
    }["App.useEffect"], [
        activeTwitchChannel,
        activeTwitchBotUsername,
        activeTwitchBotToken,
        activeBotIntegration
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "App.useEffect": ()=>{
            if (!currentAnimal || !currentAnimal.pictures || currentAnimal.pictures.length <= 1) return;
            // Rotate pictures every 5 seconds
            const interval = setInterval({
                "App.useEffect.interval": ()=>{
                    setPictureIndex({
                        "App.useEffect.interval": (prev)=>(prev + 1) % currentAnimal.pictures.length
                    }["App.useEffect.interval"]);
                }
            }["App.useEffect.interval"], 5000);
            return ({
                "App.useEffect": ()=>clearInterval(interval)
            })["App.useEffect"];
        }
    }["App.useEffect"], [
        currentAnimal
    ]);
    const handleSaveSettings = (e)=>{
        e.preventDefault();
        const parsedDuration = parseInt(displayDurationInput);
        const finalDuration = isNaN(parsedDuration) || parsedDuration < 10 ? 60 : parsedDuration;
        const parsedRotation = parseInt(rotationSizeInput);
        const finalRotation = isNaN(parsedRotation) || parsedRotation < 1 ? 50 : parsedRotation;
        const needsRefetch = activeLocation !== locationInput.trim() || activeAnimalType !== animalTypeInput || activeRotationSize !== finalRotation;
        setActiveLocation(locationInput.trim());
        setActiveAnimalType(animalTypeInput);
        setActiveDisplayDuration(finalDuration);
        setActiveRotationSize(finalRotation);
        setActiveTwitchChannel(twitchChannelInput.trim());
        setActiveTwitchBotUsername(twitchBotUsernameInput.trim());
        setActiveTwitchBotToken(twitchBotTokenInput.trim());
        setActiveBotIntegration(botIntegrationInput);
        setActiveStreamerbotUrl(streamerbotUrlInput.trim());
        // Save to LocalStorage
        localStorage.setItem('pet_overlay_location', locationInput.trim());
        localStorage.setItem('pet_overlay_animalType', animalTypeInput);
        localStorage.setItem('pet_overlay_displayDuration', finalDuration.toString());
        localStorage.setItem('pet_overlay_rotationSize', finalRotation.toString());
        localStorage.setItem('pet_overlay_twitchChannel', twitchChannelInput.trim());
        localStorage.setItem('pet_overlay_twitchBotUsername', twitchBotUsernameInput.trim());
        localStorage.setItem('pet_overlay_twitchBotToken', twitchBotTokenInput.trim());
        localStorage.setItem('pet_overlay_botIntegration', botIntegrationInput);
        localStorage.setItem('pet_overlay_streamerbotUrl', streamerbotUrlInput.trim());
        // Update inputs to match validated values
        setDisplayDurationInput(finalDuration.toString());
        setRotationSizeInput(finalRotation.toString());
        setIsSettingsOpen(false);
        if (needsRefetch) {
            setAnimals([]); // Clear current animals while loading new settings
            setNoAnimalsFound(false);
            setIsLoading(true);
        }
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "w-screen h-screen flex items-center justify-center p-12 overflow-hidden relative group",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                onClick: ()=>setIsSettingsOpen(true),
                className: "absolute top-8 right-8 z-50 p-3 bg-black/50 hover:bg-black/80 text-white/50 hover:text-white rounded-full backdrop-blur-md transition-all opacity-0 group-hover:opacity-100",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$settings$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Settings$3e$__["Settings"], {
                    className: "w-6 h-6"
                }, void 0, false, {
                    fileName: "[project]/src/components/Overlay.tsx",
                    lineNumber: 420,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/components/Overlay.tsx",
                lineNumber: 416,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$components$2f$AnimatePresence$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["AnimatePresence"], {
                children: isSettingsOpen && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["motion"].div, {
                    initial: {
                        opacity: 0,
                        scale: 0.9,
                        y: -20
                    },
                    animate: {
                        opacity: 1,
                        scale: 1,
                        y: 0
                    },
                    exit: {
                        opacity: 0,
                        scale: 0.9,
                        y: -20
                    },
                    className: "absolute top-24 right-8 z-50 w-80 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex justify-between items-center mb-4",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                    className: "text-white font-bold text-lg",
                                    children: "Overlay Settings"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/Overlay.tsx",
                                    lineNumber: 433,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    onClick: ()=>setIsSettingsOpen(false),
                                    className: "text-white/50 hover:text-white",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__["X"], {
                                        className: "w-5 h-5"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/Overlay.tsx",
                                        lineNumber: 435,
                                        columnNumber: 17
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/src/components/Overlay.tsx",
                                    lineNumber: 434,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/Overlay.tsx",
                            lineNumber: 432,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("form", {
                            onSubmit: handleSaveSettings,
                            className: "space-y-4",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                            className: "block text-sm font-medium text-slate-300 mb-1",
                                            children: "Location Filter"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/Overlay.tsx",
                                            lineNumber: 441,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                            type: "text",
                                            value: locationInput,
                                            onChange: (e)=>setLocationInput(e.target.value),
                                            placeholder: "Zip, City, or State...",
                                            className: "w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2 text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/Overlay.tsx",
                                            lineNumber: 444,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/Overlay.tsx",
                                    lineNumber: 440,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                            className: "block text-sm font-medium text-slate-300 mb-1",
                                            children: "Animal Type"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/Overlay.tsx",
                                            lineNumber: 454,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                            value: animalTypeInput,
                                            onChange: (e)=>setAnimalTypeInput(e.target.value),
                                            className: "w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-emerald-500 transition-colors",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                    value: "dogs",
                                                    className: "bg-slate-900 text-white",
                                                    children: "Dogs Only"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/Overlay.tsx",
                                                    lineNumber: 462,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                    value: "cats",
                                                    className: "bg-slate-900 text-white",
                                                    children: "Cats Only"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/Overlay.tsx",
                                                    lineNumber: 463,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                    value: "both",
                                                    className: "bg-slate-900 text-white",
                                                    children: "Dogs & Cats"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/Overlay.tsx",
                                                    lineNumber: 464,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/components/Overlay.tsx",
                                            lineNumber: 457,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/Overlay.tsx",
                                    lineNumber: 453,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex gap-4",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "w-1/2",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                    className: "block text-sm font-medium text-slate-300 mb-1",
                                                    children: "Duration (s)"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/Overlay.tsx",
                                                    lineNumber: 470,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                    type: "number",
                                                    min: "10",
                                                    value: displayDurationInput,
                                                    onChange: (e)=>setDisplayDurationInput(e.target.value),
                                                    className: "w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/Overlay.tsx",
                                                    lineNumber: 473,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/components/Overlay.tsx",
                                            lineNumber: 469,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "w-1/2",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                    className: "block text-sm font-medium text-slate-300 mb-1",
                                                    children: "Rotation Size"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/Overlay.tsx",
                                                    lineNumber: 482,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                    type: "number",
                                                    min: "1",
                                                    max: "200",
                                                    value: rotationSizeInput,
                                                    onChange: (e)=>setRotationSizeInput(e.target.value),
                                                    className: "w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/Overlay.tsx",
                                                    lineNumber: 485,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/components/Overlay.tsx",
                                            lineNumber: 481,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/Overlay.tsx",
                                    lineNumber: 468,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                            className: "block text-sm font-medium text-slate-300 mb-1 flex items-center gap-2",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$message$2d$square$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__MessageSquare$3e$__["MessageSquare"], {
                                                    className: "w-4 h-4"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/Overlay.tsx",
                                                    lineNumber: 498,
                                                    columnNumber: 19
                                                }, this),
                                                " Twitch Channel"
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/components/Overlay.tsx",
                                            lineNumber: 497,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                            type: "text",
                                            value: twitchChannelInput,
                                            onChange: (e)=>setTwitchChannelInput(e.target.value),
                                            placeholder: "e.g. ninja",
                                            className: "w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2 text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/Overlay.tsx",
                                            lineNumber: 500,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "text-xs text-slate-500 mt-1",
                                            children: "Connects chatbot for !dog and !cat commands"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/Overlay.tsx",
                                            lineNumber: 507,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/Overlay.tsx",
                                    lineNumber: 496,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                            className: "block text-sm font-medium text-slate-300 mb-1",
                                            children: "Bot Integration"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/Overlay.tsx",
                                            lineNumber: 511,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                            value: botIntegrationInput,
                                            onChange: (e)=>setBotIntegrationInput(e.target.value),
                                            className: "w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-emerald-500 transition-colors",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                    value: "none",
                                                    className: "bg-slate-900 text-white",
                                                    children: "None (Overlay Only)"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/Overlay.tsx",
                                                    lineNumber: 519,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                    value: "streamerbot",
                                                    className: "bg-slate-900 text-white",
                                                    children: "Streamer.bot"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/Overlay.tsx",
                                                    lineNumber: 520,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                    value: "twitch",
                                                    className: "bg-slate-900 text-white",
                                                    children: "Direct Twitch Auth"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/Overlay.tsx",
                                                    lineNumber: 521,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/components/Overlay.tsx",
                                            lineNumber: 514,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/Overlay.tsx",
                                    lineNumber: 510,
                                    columnNumber: 15
                                }, this),
                                botIntegrationInput === 'streamerbot' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                            className: "block text-sm font-medium text-slate-300 mb-1",
                                            children: "Streamer.bot WebSocket URL"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/Overlay.tsx",
                                            lineNumber: 527,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                            type: "text",
                                            value: streamerbotUrlInput,
                                            onChange: (e)=>setStreamerbotUrlInput(e.target.value),
                                            placeholder: "ws://127.0.0.1:8080/",
                                            className: "w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2 text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/Overlay.tsx",
                                            lineNumber: 530,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "text-xs text-slate-500 mt-1",
                                            children: "Make sure Streamer.bot WebSocket server is running."
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/Overlay.tsx",
                                            lineNumber: 537,
                                            columnNumber: 19
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/Overlay.tsx",
                                    lineNumber: 526,
                                    columnNumber: 17
                                }, this),
                                botIntegrationInput === 'twitch' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex gap-4",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "w-1/2",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                            className: "block text-sm font-medium text-slate-300 mb-1",
                                                            children: "Bot Username"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/components/Overlay.tsx",
                                                            lineNumber: 545,
                                                            columnNumber: 23
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                            type: "text",
                                                            value: twitchBotUsernameInput,
                                                            onChange: (e)=>setTwitchBotUsernameInput(e.target.value),
                                                            placeholder: "e.g. mybot",
                                                            className: "w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2 text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/components/Overlay.tsx",
                                                            lineNumber: 548,
                                                            columnNumber: 23
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/components/Overlay.tsx",
                                                    lineNumber: 544,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "w-1/2",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                            className: "block text-sm font-medium text-slate-300 mb-1",
                                                            children: "Bot OAuth Token"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/components/Overlay.tsx",
                                                            lineNumber: 557,
                                                            columnNumber: 23
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                            type: "password",
                                                            value: twitchBotTokenInput,
                                                            onChange: (e)=>setTwitchBotTokenInput(e.target.value),
                                                            placeholder: "oauth:...",
                                                            className: "w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2 text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/components/Overlay.tsx",
                                                            lineNumber: 560,
                                                            columnNumber: 23
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/components/Overlay.tsx",
                                                    lineNumber: 556,
                                                    columnNumber: 21
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/components/Overlay.tsx",
                                            lineNumber: 543,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "text-xs text-slate-500 mt-1",
                                            children: "Requires a Twitch OAuth token (e.g., from twitchapps.com/tmi)."
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/Overlay.tsx",
                                            lineNumber: 569,
                                            columnNumber: 19
                                        }, this)
                                    ]
                                }, void 0, true),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    type: "submit",
                                    className: "w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-2 rounded-xl transition-colors mt-2",
                                    children: "Apply Settings"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/Overlay.tsx",
                                    lineNumber: 573,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/Overlay.tsx",
                            lineNumber: 438,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/Overlay.tsx",
                    lineNumber: 426,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/components/Overlay.tsx",
                lineNumber: 424,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "absolute w-0 h-0 overflow-hidden opacity-0 pointer-events-none",
                children: nextAnimal?.pictures?.map((pic, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                        src: pic,
                        alt: ""
                    }, `preload-${i}`, false, {
                        fileName: "[project]/src/components/Overlay.tsx",
                        lineNumber: 587,
                        columnNumber: 11
                    }, this))
            }, void 0, false, {
                fileName: "[project]/src/components/Overlay.tsx",
                lineNumber: 585,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$components$2f$AnimatePresence$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["AnimatePresence"], {
                mode: "wait",
                children: !currentAnimal ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["motion"].div, {
                    initial: {
                        opacity: 0
                    },
                    animate: {
                        opacity: 1
                    },
                    exit: {
                        opacity: 0
                    },
                    className: "flex flex-col items-center justify-center font-medium h-full w-full",
                    children: isLoading ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex flex-col items-center bg-black/60 p-8 rounded-3xl backdrop-blur-md border border-white/10 shadow-2xl",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mb-4"
                            }, void 0, false, {
                                fileName: "[project]/src/components/Overlay.tsx",
                                lineNumber: 602,
                                columnNumber: 17
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "text-xl animate-pulse text-white",
                                children: activeLocation ? `Searching for animals near ${activeLocation}...` : 'Loading animals...'
                            }, void 0, false, {
                                fileName: "[project]/src/components/Overlay.tsx",
                                lineNumber: 603,
                                columnNumber: 17
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/Overlay.tsx",
                        lineNumber: 601,
                        columnNumber: 15
                    }, this) : noAnimalsFound ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex flex-col items-center bg-black/60 p-8 rounded-3xl backdrop-blur-md border border-white/10 shadow-2xl",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$search$2d$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__SearchX$3e$__["SearchX"], {
                                className: "w-12 h-12 mb-4 text-white/50"
                            }, void 0, false, {
                                fileName: "[project]/src/components/Overlay.tsx",
                                lineNumber: 609,
                                columnNumber: 17
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "text-xl text-white",
                                children: [
                                    "No animals found near ",
                                    activeLocation
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/Overlay.tsx",
                                lineNumber: 610,
                                columnNumber: 17
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "text-sm mt-2 text-white/50",
                                children: "Try a different location or animal type"
                            }, void 0, false, {
                                fileName: "[project]/src/components/Overlay.tsx",
                                lineNumber: 611,
                                columnNumber: 17
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/Overlay.tsx",
                        lineNumber: 608,
                        columnNumber: 15
                    }, this) : null
                }, "loading-state", false, {
                    fileName: "[project]/src/components/Overlay.tsx",
                    lineNumber: 593,
                    columnNumber: 11
                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["motion"].div, {
                    initial: {
                        opacity: 0,
                        y: 20,
                        scale: 0.95
                    },
                    animate: {
                        opacity: 1,
                        y: 0,
                        scale: 1
                    },
                    exit: {
                        opacity: 0,
                        y: -20,
                        scale: 0.95
                    },
                    transition: {
                        duration: 1,
                        ease: [
                            0.16,
                            1,
                            0.3,
                            1
                        ]
                    },
                    className: "relative w-full max-w-5xl flex rounded-[2.5rem] shadow-[0_0_80px_rgba(0,0,0,0.5)]",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "absolute -inset-1 bg-gradient-to-br from-emerald-400/40 via-white/5 to-sky-400/40 rounded-[2.5rem] blur-2xl opacity-80 -z-10"
                        }, void 0, false, {
                            fileName: "[project]/src/components/Overlay.tsx",
                            lineNumber: 625,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "absolute -inset-4 bg-black/20 rounded-[3rem] blur-xl -z-20"
                        }, void 0, false, {
                            fileName: "[project]/src/components/Overlay.tsx",
                            lineNumber: 626,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "relative w-full flex bg-gradient-to-br from-slate-800/80 to-zinc-900/80 backdrop-blur-3xl border border-white/20 rounded-[2.5rem] overflow-hidden ring-1 ring-white/10 shadow-2xl",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-50"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/Overlay.tsx",
                                    lineNumber: 632,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "absolute inset-y-0 left-0 w-px bg-gradient-to-b from-white/20 to-transparent opacity-50"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/Overlay.tsx",
                                    lineNumber: 633,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "w-1/2 relative bg-slate-900 aspect-square overflow-hidden",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "absolute inset-0 shadow-[inset_0_0_20px_rgba(0,0,0,0.3)] z-20 pointer-events-none"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/Overlay.tsx",
                                            lineNumber: 638,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent z-10 pointer-events-none"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/Overlay.tsx",
                                            lineNumber: 640,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$components$2f$AnimatePresence$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["AnimatePresence"], {
                                            mode: "wait",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["motion"].img, {
                                                src: currentAnimal.pictures?.[pictureIndex],
                                                alt: currentAnimal.name,
                                                initial: {
                                                    opacity: 0,
                                                    scale: 1.05
                                                },
                                                animate: {
                                                    opacity: 1,
                                                    scale: 1
                                                },
                                                exit: {
                                                    opacity: 0
                                                },
                                                transition: {
                                                    duration: 1.5,
                                                    ease: "easeInOut"
                                                },
                                                className: "absolute inset-0 w-full h-full object-cover"
                                            }, currentAnimal.pictures?.[pictureIndex] || 'fallback', false, {
                                                fileName: "[project]/src/components/Overlay.tsx",
                                                lineNumber: 643,
                                                columnNumber: 17
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/Overlay.tsx",
                                            lineNumber: 642,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "absolute bottom-8 left-0 right-0 flex justify-center gap-3 z-30",
                                            children: currentAnimal.pictures?.map((_, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: `h-1.5 rounded-full transition-all duration-700 shadow-[0_0_10px_rgba(0,0,0,0.5)] ${i === pictureIndex ? 'w-8 bg-white shadow-[0_0_15px_rgba(255,255,255,0.8)]' : 'w-2 bg-white/30'}`
                                                }, i, false, {
                                                    fileName: "[project]/src/components/Overlay.tsx",
                                                    lineNumber: 658,
                                                    columnNumber: 19
                                                }, this))
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/Overlay.tsx",
                                            lineNumber: 656,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/Overlay.tsx",
                                    lineNumber: 636,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "w-1/2 p-12 flex flex-col justify-between text-white relative",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "absolute top-0 right-0 w-96 h-96 bg-emerald-400/20 blur-[100px] rounded-full pointer-events-none"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/Overlay.tsx",
                                            lineNumber: 669,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "absolute bottom-0 left-0 w-64 h-64 bg-sky-400/20 blur-[80px] rounded-full pointer-events-none"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/Overlay.tsx",
                                            lineNumber: 670,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "relative z-10",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-bold tracking-wide mb-8 shadow-[0_0_20px_rgba(16,185,129,0.2)] backdrop-blur-md",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$sparkles$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Sparkles$3e$__["Sparkles"], {
                                                            className: "w-4 h-4"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/components/Overlay.tsx",
                                                            lineNumber: 674,
                                                            columnNumber: 19
                                                        }, this),
                                                        "Looking for a home"
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/components/Overlay.tsx",
                                                    lineNumber: 673,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["motion"].h1, {
                                                    initial: {
                                                        opacity: 0,
                                                        x: -20
                                                    },
                                                    animate: {
                                                        opacity: 1,
                                                        x: 0
                                                    },
                                                    className: "text-7xl font-extrabold tracking-tight mb-2 drop-shadow-[0_5px_15px_rgba(0,0,0,0.5)] bg-clip-text text-transparent bg-gradient-to-br from-white to-white/70 flex items-baseline gap-4 overflow-hidden",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: "truncate",
                                                            children: currentAnimal.name
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/components/Overlay.tsx",
                                                            lineNumber: 684,
                                                            columnNumber: 19
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: "text-3xl font-medium text-white/30 shrink-0",
                                                            children: [
                                                                "#",
                                                                currentAnimal.dailyNumber
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/src/components/Overlay.tsx",
                                                            lineNumber: 685,
                                                            columnNumber: 19
                                                        }, this)
                                                    ]
                                                }, currentAnimal.name, true, {
                                                    fileName: "[project]/src/components/Overlay.tsx",
                                                    lineNumber: 678,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["motion"].div, {
                                                    initial: {
                                                        opacity: 0,
                                                        x: -20
                                                    },
                                                    animate: {
                                                        opacity: 1,
                                                        x: 0
                                                    },
                                                    transition: {
                                                        delay: 0.1
                                                    },
                                                    className: "text-2xl text-emerald-100/80 font-medium mb-10 drop-shadow-md line-clamp-2",
                                                    children: currentAnimal.breed
                                                }, currentAnimal.breed, false, {
                                                    fileName: "[project]/src/components/Overlay.tsx",
                                                    lineNumber: 688,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "space-y-6",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "flex items-center gap-5 text-lg group",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] group-hover:bg-white/10 transition-colors",
                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$info$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Info$3e$__["Info"], {
                                                                        className: "w-6 h-6 text-white/70"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/components/Overlay.tsx",
                                                                        lineNumber: 701,
                                                                        columnNumber: 23
                                                                    }, this)
                                                                }, void 0, false, {
                                                                    fileName: "[project]/src/components/Overlay.tsx",
                                                                    lineNumber: 700,
                                                                    columnNumber: 21
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "overflow-hidden",
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            className: "text-xs text-white/40 uppercase tracking-widest font-bold mb-1",
                                                                            children: "Age"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/src/components/Overlay.tsx",
                                                                            lineNumber: 704,
                                                                            columnNumber: 23
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            className: "font-semibold drop-shadow-md text-white/90 truncate",
                                                                            children: currentAnimal.age
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/src/components/Overlay.tsx",
                                                                            lineNumber: 705,
                                                                            columnNumber: 23
                                                                        }, this)
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/src/components/Overlay.tsx",
                                                                    lineNumber: 703,
                                                                    columnNumber: 21
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/src/components/Overlay.tsx",
                                                            lineNumber: 699,
                                                            columnNumber: 19
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "flex items-center gap-5 text-lg group",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] group-hover:bg-white/10 transition-colors",
                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$map$2d$pin$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__MapPin$3e$__["MapPin"], {
                                                                        className: "w-6 h-6 text-white/70"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/components/Overlay.tsx",
                                                                        lineNumber: 711,
                                                                        columnNumber: 23
                                                                    }, this)
                                                                }, void 0, false, {
                                                                    fileName: "[project]/src/components/Overlay.tsx",
                                                                    lineNumber: 710,
                                                                    columnNumber: 21
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "overflow-hidden",
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            className: "text-xs text-white/40 uppercase tracking-widest font-bold mb-1",
                                                                            children: "Location"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/src/components/Overlay.tsx",
                                                                            lineNumber: 714,
                                                                            columnNumber: 23
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            className: "font-semibold drop-shadow-md text-white/90 truncate",
                                                                            children: currentAnimal.location
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/src/components/Overlay.tsx",
                                                                            lineNumber: 715,
                                                                            columnNumber: 23
                                                                        }, this)
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/src/components/Overlay.tsx",
                                                                    lineNumber: 713,
                                                                    columnNumber: 21
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/src/components/Overlay.tsx",
                                                            lineNumber: 709,
                                                            columnNumber: 19
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "flex items-center gap-5 text-lg group",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] group-hover:bg-white/10 transition-colors",
                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$heart$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Heart$3e$__["Heart"], {
                                                                        className: "w-6 h-6 text-white/70"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/components/Overlay.tsx",
                                                                        lineNumber: 721,
                                                                        columnNumber: 23
                                                                    }, this)
                                                                }, void 0, false, {
                                                                    fileName: "[project]/src/components/Overlay.tsx",
                                                                    lineNumber: 720,
                                                                    columnNumber: 21
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "overflow-hidden",
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            className: "text-xs text-white/40 uppercase tracking-widest font-bold mb-1",
                                                                            children: "Rescue / Shelter"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/src/components/Overlay.tsx",
                                                                            lineNumber: 724,
                                                                            columnNumber: 23
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            className: "font-semibold drop-shadow-md text-white/90 truncate",
                                                                            children: currentAnimal.shelter
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/src/components/Overlay.tsx",
                                                                            lineNumber: 725,
                                                                            columnNumber: 23
                                                                        }, this)
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/src/components/Overlay.tsx",
                                                                    lineNumber: 723,
                                                                    columnNumber: 21
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/src/components/Overlay.tsx",
                                                            lineNumber: 719,
                                                            columnNumber: 19
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/components/Overlay.tsx",
                                                    lineNumber: 698,
                                                    columnNumber: 17
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/components/Overlay.tsx",
                                            lineNumber: 672,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "mt-10 pt-8 border-t border-white/10 flex items-center gap-8 relative z-10",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "relative group",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "absolute -inset-2 bg-emerald-400/30 rounded-3xl blur-xl group-hover:bg-emerald-400/40 transition-colors duration-500"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/components/Overlay.tsx",
                                                            lineNumber: 733,
                                                            columnNumber: 19
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "relative bg-white p-3.5 rounded-2xl shrink-0 shadow-[0_10px_20px_rgba(0,0,0,0.3)] ring-1 ring-black/5",
                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$qrcode$2e$react$2f$lib$2f$esm$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["QRCodeSVG"], {
                                                                value: currentAnimal.url || 'https://rescuegroups.org',
                                                                size: 100,
                                                                level: "H",
                                                                className: "drop-shadow-sm"
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/components/Overlay.tsx",
                                                                lineNumber: 735,
                                                                columnNumber: 21
                                                            }, this)
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/components/Overlay.tsx",
                                                            lineNumber: 734,
                                                            columnNumber: 19
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/components/Overlay.tsx",
                                                    lineNumber: 732,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "text-2xl font-bold mb-2 drop-shadow-lg text-white/90",
                                                            children: "Scan to Adopt"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/components/Overlay.tsx",
                                                            lineNumber: 739,
                                                            columnNumber: 19
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "text-white/50 text-base flex items-center gap-2 font-medium",
                                                            children: [
                                                                "Or type ",
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                    className: "font-mono bg-black/40 border border-white/10 px-2.5 py-1 rounded-lg text-emerald-300 font-bold shadow-inner",
                                                                    children: [
                                                                        "!",
                                                                        currentAnimal.type,
                                                                        " ",
                                                                        currentAnimal.dailyNumber
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/src/components/Overlay.tsx",
                                                                    lineNumber: 741,
                                                                    columnNumber: 29
                                                                }, this),
                                                                " in chat"
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/src/components/Overlay.tsx",
                                                            lineNumber: 740,
                                                            columnNumber: 19
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/components/Overlay.tsx",
                                                    lineNumber: 738,
                                                    columnNumber: 17
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/components/Overlay.tsx",
                                            lineNumber: 731,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/Overlay.tsx",
                                    lineNumber: 667,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/Overlay.tsx",
                            lineNumber: 629,
                            columnNumber: 11
                        }, this)
                    ]
                }, currentAnimal.id, true, {
                    fileName: "[project]/src/components/Overlay.tsx",
                    lineNumber: 616,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/components/Overlay.tsx",
                lineNumber: 591,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/Overlay.tsx",
        lineNumber: 413,
        columnNumber: 5
    }, this);
}
_s(App, "csXmZRsD6lyGDcpuXl09+tCmAfc=");
_c1 = App;
var _c, _c1;
__turbopack_context__.k.register(_c, "AppWrapper");
__turbopack_context__.k.register(_c1, "App");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=src_02zk7yp._.js.map