import React, { useState } from 'react';
import { MapPin } from 'lucide-react';
import { useGeolocated } from 'react-geolocated';

const EMPTY_ADDRESS = {
  street: '',
  city: '',
  state: '',
  zip: '',
  country: ''
};

function formatAddress(address) {
  return [address.street, address.city, address.state, address.zip, address.country]
    .filter(Boolean)
    .join(', ');
}

function AddressForm({ onAddressChange }) {
  const [address, setAddress] = useState(EMPTY_ADDRESS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const reverseGeocode = async ({ latitude, longitude }) => {
    try {
      const query = new URLSearchParams({
        format: 'jsonv2',
        lat: String(latitude),
        lon: String(longitude),
        addressdetails: '1'
      });
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${query}`);
      if (!response.ok) throw new Error('The address lookup service is unavailable. Try again.');
      const data = await response.json();

      if (data && data.address) {
        const addr = data.address;
        const nextAddress = {
          street: [addr.house_number, addr.road || addr.pedestrian || addr.neighbourhood]
            .filter(Boolean)
            .join(' '),
          city: addr.city || addr.town || addr.village || addr.municipality || '',
          state: addr.state || addr.region || '',
          zip: addr.postcode || '',
          country: addr.country || ''
        };

        if (!formatAddress(nextAddress)) {
          setError('Could not find a delivery address for your current location.');
          return;
        }

        setAddress(nextAddress);
        onAddressChange(nextAddress);
      } else {
        setError('Could not find a delivery address for your current location.');
      }
    } catch (lookupError) {
      setError(lookupError.message || 'Could not look up your address. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const { getPosition, isGeolocationAvailable } = useGeolocated({
    positionOptions: { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 },
    userDecisionTimeout: 10000,
    suppressLocationOnMount: true,
    isOptimisticGeolocationEnabled: false,
    onSuccess: (position) => reverseGeocode(position.coords),
    onError: (geoError) => {
      setError(geoError.code === 1
        ? 'Allow location access in your browser to use your current address.'
        : 'Could not get your current location. Check your device settings and try again.');
      setLoading(false);
    }
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const nextAddress = { ...address, [name]: value };
    setAddress(nextAddress);
    onAddressChange(nextAddress);
  };

  const handleAutoFill = () => {
    if (!isGeolocationAvailable) {
      setError('Geolocation is not supported by your browser.');
      return;
    }

    setLoading(true);
    setError(null);
    getPosition();
  };

  return (
    <div className="sd-address">
      <button type="button" className="sd-address__locate" onClick={handleAutoFill} disabled={loading}>
        <MapPin size={15} />
        {loading ? 'Finding your address…' : 'Use my current location'}
      </button>

      {error && <p className="sd-address__error" role="alert">{error}</p>}

      <div className="sd-address__grid">
        <label className="sd-address__field sd-address__field--full">
          Street address
          <input name="street" value={address.street} onChange={handleInputChange} autoComplete="street-address" />
        </label>
        <label className="sd-address__field">
          City
          <input name="city" value={address.city} onChange={handleInputChange} autoComplete="address-level2" />
        </label>
        <label className="sd-address__field">
          State / region
          <input name="state" value={address.state} onChange={handleInputChange} autoComplete="address-level1" />
        </label>
        <label className="sd-address__field">
          ZIP / postal code
          <input name="zip" value={address.zip} onChange={handleInputChange} autoComplete="postal-code" />
        </label>
        <label className="sd-address__field">
          Country
          <input name="country" value={address.country} onChange={handleInputChange} autoComplete="country-name" />
        </label>
      </div>
    </div>
  );
}

export default AddressForm;
