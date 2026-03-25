import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { authenticatedApiRequest } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { MapPin, Navigation, AlertCircle, Settings } from 'lucide-react';
import type { Property } from '@shared/schema';

interface LocationFinderProps {
  onPropertySelect?: (property: Property) => void;
}

interface UserLocation {
  latitude: number;
  longitude: number;
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export default function PropertyLocationFinder({ onPropertySelect }: LocationFinderProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  const { data: properties, isLoading: propertiesLoading } = useQuery({
    queryKey: ['/api/properties', user?.agencyId],
    queryFn: async () => {
      if (!user?.agencyId) throw new Error('No agency ID');
      const response = await authenticatedApiRequest('GET', `/api/properties/${user.agencyId}`);
      return response.json() as Promise<Property[]>;
    },
    enabled: !!user?.agencyId,
  });

  const getCurrentLocation = () => {
    setIsLoadingLocation(true);
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by this browser');
      setIsLoadingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setIsLoadingLocation(false);
        toast({
          title: 'Location Found',
          description: 'Your current location has been detected successfully',
        });
      },
      (error) => {
        let errorMessage = 'Unable to get your location';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied by user';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out';
            break;
        }
        setLocationError(errorMessage);
        setIsLoadingLocation(false);
        toast({
          title: 'Location Error',
          description: errorMessage,
          variant: 'destructive',
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 600000, // 10 minutes
      }
    );
  };

  const nearbyProperties = properties && userLocation
    ? properties
        .filter(property => property.latitude && property.longitude)
        .map(property => ({
          ...property,
          distance: calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            parseFloat(property.latitude!),
            parseFloat(property.longitude!)
          ),
        }))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 10) // Show top 10 nearest properties
    : [];

  const formatDistance = (distance: number): string => {
    if (distance < 1) {
      return `${Math.round(distance * 1000)}m`;
    }
    return `${distance.toFixed(1)}km`;
  };

  const openInMaps = (property: Property) => {
    if (!property.latitude || !property.longitude) return;
    
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
      // Use device's default maps app
      window.open(`geo:${property.latitude},${property.longitude}?q=${encodeURIComponent(property.address)}`);
    } else {
      // Use Google Maps in browser
      window.open(`https://www.google.com/maps/search/?api=1&query=${property.latitude},${property.longitude}`);
    }
  };

  if (propertiesLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <MapPin className="w-5 h-5 mr-2" />
            Nearby Properties
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-3 p-3 border rounded-lg">
                <Skeleton className="w-8 h-8 rounded" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-6 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <MapPin className="w-5 h-5 mr-2" />
            Nearby Properties
          </div>
          <Button
            onClick={getCurrentLocation}
            disabled={isLoadingLocation}
            size="sm"
            variant="outline"
          >
            <Navigation className="w-4 h-4 mr-2" />
            {isLoadingLocation ? 'Locating...' : 'Get Location'}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {locationError && (
          <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <p className="text-sm text-red-700">{locationError}</p>
          </div>
        )}

        {!userLocation && !locationError && (
          <div className="text-center py-8">
            <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">Enable location access to find nearby properties</p>
            <Button onClick={getCurrentLocation} disabled={isLoadingLocation}>
              <Navigation className="w-4 h-4 mr-2" />
              {isLoadingLocation ? 'Getting Location...' : 'Enable Location'}
            </Button>
          </div>
        )}

        {userLocation && nearbyProperties.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 mb-4">
              Found {nearbyProperties.length} properties near your location
            </p>
            {nearbyProperties.map((property) => (
              <div
                key={property.id}
                className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => onPropertySelect?.(property)}
              >
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{property.name}</p>
                  <p className="text-xs text-gray-500 truncate">{property.address}</p>
                  <Badge variant="outline" className="text-xs mt-1">
                    {property.propertyType}
                  </Badge>
                </div>
                <div className="text-right">
                  <Badge variant="secondary" className="text-xs">
                    {formatDistance(property.distance)}
                  </Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="ml-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      openInMaps(property);
                    }}
                  >
                    <Navigation className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {userLocation && nearbyProperties.length === 0 && (
          <div className="text-center py-8">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">No properties found in your area</p>
            <p className="text-sm text-gray-400">
              Properties need GPS coordinates to appear in location search
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}