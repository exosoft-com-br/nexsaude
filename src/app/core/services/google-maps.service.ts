import { Injectable, NgZone } from '@angular/core';
import { Observable, Subject, from } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { PlaceResult } from '../models/lead.model';

declare const google: typeof globalThis.google;

@Injectable({ providedIn: 'root' })
export class GoogleMapsService {

  private mapsLoaded = false;
  private loadPromise: Promise<void> | null = null;

  constructor(private zone: NgZone) {}

  // ----------------------------------------------------------------
  // Carregar SDK do Google Maps dinamicamente (evita bloquear SSR)
  // ----------------------------------------------------------------
  loadMapsApi(): Promise<void> {
    if (this.mapsLoaded) return Promise.resolve();
    if (this.loadPromise)  return this.loadPromise;

    this.loadPromise = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${environment.googleMaps.apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload  = () => { this.mapsLoaded = true; resolve(); };
      script.onerror = () => reject(new Error('Falha ao carregar Google Maps API'));
      document.head.appendChild(script);
    });

    return this.loadPromise;
  }

  // ----------------------------------------------------------------
  // Buscar empresas próximas via Places API (NearbySearch)
  // ----------------------------------------------------------------
  buscarEmpresasProximas(
    latitude: number,
    longitude: number,
    raioMetros = 2000,
    tipo = 'establishment'
  ): Observable<PlaceResult[]> {
    return new Observable<PlaceResult[]>(observer => {
      this.loadMapsApi().then(() => {
        const map = new google.maps.Map(document.createElement('div'));
        const service = new google.maps.places.PlacesService(map);

        const request: google.maps.places.PlaceSearchRequest = {
          location: new google.maps.LatLng(latitude, longitude),
          radius:   raioMetros,
          type:     tipo,
        };

        service.nearbySearch(request, (results, status) => {
          this.zone.run(() => {
            if (status === google.maps.places.PlacesServiceStatus.OK && results) {
              const mapped = results.map(r => this.mapPlaceToResult(r));
              observer.next(mapped);
              observer.complete();
            } else {
              observer.error(new Error(`Places API erro: ${status}`));
            }
          });
        });
      }).catch(err => observer.error(err));
    });
  }

  // ----------------------------------------------------------------
  // Buscar por texto (ex: "empresas de TI em Campinas SP")
  // ----------------------------------------------------------------
  buscarPorTexto(
    query: string,
    latitude?: number,
    longitude?: number,
    raioMetros = 5000
  ): Observable<PlaceResult[]> {
    return new Observable<PlaceResult[]>(observer => {
      this.loadMapsApi().then(() => {
        const map = new google.maps.Map(document.createElement('div'));
        const service = new google.maps.places.PlacesService(map);

        const request: google.maps.places.TextSearchRequest = {
          query,
          location: latitude && longitude
            ? new google.maps.LatLng(latitude, longitude)
            : undefined,
          radius: latitude ? raioMetros : undefined,
        };

        service.textSearch(request, (results, status) => {
          this.zone.run(() => {
            if (status === google.maps.places.PlacesServiceStatus.OK && results) {
              observer.next(results.map(r => this.mapPlaceToResult(r)));
              observer.complete();
            } else {
              observer.error(new Error(`Places API texto erro: ${status}`));
            }
          });
        });
      }).catch(err => observer.error(err));
    });
  }

  // ----------------------------------------------------------------
  // Detalhar um lugar específico (telefone, website, etc.)
  // ----------------------------------------------------------------
  detalharPlace(placeId: string): Observable<PlaceResult> {
    return new Observable<PlaceResult>(observer => {
      this.loadMapsApi().then(() => {
        const map = new google.maps.Map(document.createElement('div'));
        const service = new google.maps.places.PlacesService(map);

        service.getDetails(
          {
            placeId,
            fields: [
              'place_id', 'name', 'formatted_address', 'geometry',
              'formatted_phone_number', 'website', 'rating', 'user_ratings_total',
              'types',
            ],
          },
          (place, status) => {
            this.zone.run(() => {
              if (status === google.maps.places.PlacesServiceStatus.OK && place) {
                observer.next(this.mapPlaceToResult(place));
                observer.complete();
              } else {
                observer.error(new Error(`Place Details erro: ${status}`));
              }
            });
          }
        );
      }).catch(err => observer.error(err));
    });
  }

  // ----------------------------------------------------------------
  // Geolocalização do usuário
  // ----------------------------------------------------------------
  obterLocalizacaoAtual(): Observable<GeolocationCoordinates> {
    return new Observable(observer => {
      if (!navigator.geolocation) {
        observer.error(new Error('Geolocalização não suportada neste navegador'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        pos  => this.zone.run(() => { observer.next(pos.coords); observer.complete(); }),
        err  => this.zone.run(() => observer.error(err)),
        { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
      );
    });
  }

  // ----------------------------------------------------------------
  // Mapper interno
  // ----------------------------------------------------------------
  private mapPlaceToResult(place: google.maps.places.PlaceResult): PlaceResult {
    return {
      place_id:           place.place_id ?? '',
      nome_empresa:       place.name ?? '',
      endereco_formatado: place.formatted_address ?? place.vicinity ?? '',
      latitude:           place.geometry?.location?.lat() ?? 0,
      longitude:          place.geometry?.location?.lng() ?? 0,
      telefone_maps:      place.formatted_phone_number,
      website:            place.website,
      rating:             place.rating,
      total_avaliacoes:   place.user_ratings_total,
      categoria_maps:     place.types?.[0],
    };
  }
}
