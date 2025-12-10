# OpenStreetMap Nominatim Examples for Kuwait

## API Endpoint
```
https://nominatim.openstreetmap.org/reverse
```

## Required Parameters
- `lat`: Latitude (e.g., 29.3375)
- `lon`: Longitude (e.g., 48.0758)
- `format`: json
- `addressdetails`: 1 (to get structured address components)
- `accept-language`: en,ar (for bilingual support)

## Required Header
```
User-Agent: FormGenerator/1.0
```

## Rate Limits
- **1 request per second** (per IP address)
- **2,500 requests per day** (per IP address)

---

## Example 1: Salmiya (Kuwait City)

### Coordinates
- Latitude: `29.3375`
- Longitude: `48.0758`

### API Call
```bash
curl "https://nominatim.openstreetmap.org/reverse?lat=29.3375&lon=48.0758&format=json&addressdetails=1&accept-language=en,ar" \
  -H "User-Agent: FormGenerator/1.0"
```

### Response (English)
```json
{
  "display_name": "Hamad Al-Mubarak Street, Salmiya - Block 5, Salmiya, Hawalli Governorate, 20004, Kuwait",
  "address": {
    "road": "Hamad Al-Mubarak Street",
    "neighbourhood": "Salmiya - Block 5",
    "city": "Salmiya",
    "state": "Hawalli Governorate",
    "postcode": "20004",
    "country": "Kuwait",
    "country_code": "kw"
  },
  "lat": "29.3377842",
  "lon": "48.0756209"
}
```

### Response (Arabic)
```json
{
  "display_name": "شارع حمد المبارك, السالمية - قطعة 5, السالمية, محافظة حولي, 20004, الكويت",
  "address": {
    "city": "السالمية",
    "country": "الكويت"
  }
}
```

---

## Example 2: Kuwait Towers Area

### Coordinates
- Latitude: `29.3897`
- Longitude: `48.0031`

### API Call
```bash
curl "https://nominatim.openstreetmap.org/reverse?lat=29.3897&lon=48.0031&format=json&addressdetails=1&accept-language=en,ar" \
  -H "User-Agent: FormGenerator/1.0"
```

### Response
```json
{
  "display_name": "Arabian Gulf Street, Sharq, Dasman, Capital Governorate, 13021, Kuwait",
  "address": {
    "road": "Arabian Gulf Street",
    "suburb": "Sharq",
    "city": "Dasman",
    "state": "Capital Governorate",
    "postcode": "13021",
    "country": "Kuwait",
    "country_code": "kw"
  }
}
```

---

## Example 3: The Avenues Mall Area

### Coordinates
- Latitude: `29.3386`
- Longitude: `48.0814`

### API Call
```bash
curl "https://nominatim.openstreetmap.org/reverse?lat=29.3386&lon=48.0814&format=json&addressdetails=1&accept-language=en,ar" \
  -H "User-Agent: FormGenerator/1.0"
```

### Response
```json
{
  "display_name": "Salmiya Co-Op Society - Main Supermarket, Hamad Al-Mubarak Street, Salmiya - Block 5, Salmiya, Hawalli Governorate, 20004, Kuwait",
  "address": {
    "shop": "Salmiya Co-Op Society - Main Supermarket",
    "road": "Hamad Al-Mubarak Street",
    "neighbourhood": "Salmiya - Block 5",
    "city": "Salmiya",
    "state": "Hawalli Governorate",
    "postcode": "20004",
    "country": "Kuwait",
    "country_code": "kw"
  }
}
```

---

## Example 4: Hawalli

### Coordinates
- Latitude: `29.3333`
- Longitude: `48.0333`

### API Call
```bash
curl "https://nominatim.openstreetmap.org/reverse?lat=29.3333&lon=48.0333&format=json&addressdetails=1&accept-language=en,ar" \
  -H "User-Agent: FormGenerator/1.0"
```

### Response
```json
{
  "display_name": "Street 317, Hawally - Block 7, Hawally, Hawalli Governorate, 30004, Kuwait",
  "address": {
    "road": "Street 317",
    "neighbourhood": "Hawally - Block 7",
    "city": "Hawally",
    "state": "Hawalli Governorate",
    "postcode": "30004",
    "country": "Kuwait",
    "country_code": "kw"
  }
}
```

---

## Example 5: Kuwait International Airport

### Coordinates
- Latitude: `29.2267`
- Longitude: `47.9689`

### API Call
```bash
curl "https://nominatim.openstreetmap.org/reverse?lat=29.2267&lon=47.9689&format=json&addressdetails=1&accept-language=en,ar" \
  -H "User-Agent: FormGenerator/1.0"
```

### Response
```json
{
  "display_name": "International Airport, Farwaniya Governorate, Kuwait",
  "address": {
    "aeroway": "International Airport",
    "city": "International Airport",
    "state": "Farwaniya Governorate",
    "country": "Kuwait",
    "country_code": "kw"
  }
}
```

---

## JavaScript Implementation Example

```javascript
async function reverseGeocode(lat, lng, locale = 'en') {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&accept-language=${locale === 'ar' ? 'ar' : 'en,ar'}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'FormGenerator/1.0'
      }
    });
    
    if (!response.ok) {
      throw new Error('Geocoding failed');
    }
    
    const data = await response.json();
    
    return {
      display_name: data.display_name,
      address: {
        road: data.address?.road || '',
        neighbourhood: data.address?.neighbourhood || '',
        city: data.address?.city || '',
        state: data.address?.state || '',
        postcode: data.address?.postcode || '',
        country: data.address?.country || '',
        country_code: data.address?.country_code || ''
      },
      coordinates: {
        lat: parseFloat(data.lat),
        lng: parseFloat(data.lon)
      }
    };
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return null;
  }
}

// Usage
const result = await reverseGeocode(29.3375, 48.0758, 'en');
console.log(result.display_name);
// "Hamad Al-Mubarak Street, Salmiya - Block 5, Salmiya, Hawalli Governorate, 20004, Kuwait"
```

---

## Response Structure

### Full Response Fields
- `place_id`: Unique identifier
- `lat`: Latitude (string)
- `lon`: Longitude (string)
- `display_name`: Full formatted address
- `address`: Structured address components
  - `road`: Street name
  - `neighbourhood`: Block/neighbourhood (e.g., "Salmiya - Block 5")
  - `city`: City name (e.g., "Salmiya", "Hawally")
  - `state`: Governorate (e.g., "Hawalli Governorate")
  - `postcode`: Postal code
  - `country`: Country name
  - `country_code`: ISO country code (e.g., "kw")

---

## Notes

1. **Rate Limiting**: Remember to respect the 1 req/sec and 2,500/day limits
2. **User-Agent**: Always include a valid User-Agent header
3. **Language**: Use `accept-language=en,ar` for bilingual support
4. **Caching**: Consider caching results to reduce API calls
5. **Error Handling**: Always handle cases where geocoding fails

---

## Integration with Location Field

When implementing in the LocationPicker component:

```typescript
const location = {
  lat: 29.3375,
  lng: 48.0758,
  accuracy: 10,
  address: "Hamad Al-Mubarak Street, Salmiya - Block 5, Salmiya, Hawalli Governorate, 20004, Kuwait",
  address_ar: "شارع حمد المبارك, السالمية - قطعة 5, السالمية, محافظة حولي, 20004, الكويت",
  address_components: {
    road: "Hamad Al-Mubarak Street",
    neighbourhood: "Salmiya - Block 5",
    city: "Salmiya",
    state: "Hawalli Governorate",
    postcode: "20004",
    country: "Kuwait"
  },
  url: "https://www.google.com/maps?q=29.3375,48.0758"
}
```



