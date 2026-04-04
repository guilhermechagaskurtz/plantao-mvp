'use client'

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect } from 'react'
import { useMap } from 'react-leaflet'

type Shift = {
    id: string
    latitude: number
    longitude: number
    specialty: string
}

const icon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41]
})

function FitBounds({
    shifts,
    centerLat,
    centerLng,
    radiusKm
}: {
    shifts: any[]
    centerLat?: number | null
    centerLng?: number | null
    radiusKm?: number | null
}) {
    const map = useMap()

    useEffect(() => {
        if (!map) return

        // se tiver preferência → centraliza nela
        if (centerLat && centerLng && radiusKm) {
            map.setView([centerLat, centerLng], 12)
            return
        }

        // fallback → mostra todos
        if (!shifts.length) return

        const bounds = shifts.map(s => [s.latitude, s.longitude] as [number, number])
        map.fitBounds(bounds, { padding: [50, 50] })

    }, [shifts, map, centerLat, centerLng, radiusKm])

    return null
}

function FocusOnSelected({
    shifts,
    selectedShiftId
}: {
    shifts: any[]
    selectedShiftId: string | null
}) {
    const map = useMap()

    useEffect(() => {
        if (!selectedShiftId) return

        const shift = shifts.find(s => s.id === selectedShiftId)
        if (!shift) return

        const target = [shift.latitude, shift.longitude] as [number, number]

        // distância atual do centro do mapa
        const currentCenter = map.getCenter()
        const distance = map.distance(currentCenter, target)

        // se estiver longe, centraliza com zoom
        if (distance > 2000) {
            map.setView(target, 15)
        } else {
            // se já estiver perto, só move suave
            map.panTo(target)
        }
    }, [selectedShiftId, shifts, map])

    return null
}

export default function Map({
    shifts,
    selectedShiftId,
    onSelect,
    centerLat,
    centerLng,
    radiusKm
}: {
    shifts: Shift[]
    selectedShiftId: string | null
    onSelect: (id: string) => void
    centerLat?: number | null
    centerLng?: number | null
    radiusKm?: number | null
}) {
    const center =
        centerLat && centerLng
            ? [centerLat, centerLng]
            : shifts.length > 0
                ? [shifts[0].latitude, shifts[0].longitude]
                : [-30, -51]

    useEffect(() => {
        const el = document.querySelector('.leaflet-container') as HTMLElement

        if (el) {
            el.style.position = 'relative'
            el.style.zIndex = '0'
        }
    }, [])
    return (
        <div className="w-full h-[500px] lg:h-[600px] relative overflow-hidden rounded-lg border">
            <MapContainer
                center={center as any}
                zoom={13}
                style={{ width: '100%', height: '100%' }}
            >
                <TileLayer
                    attribution='&copy; OpenStreetMap'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <FitBounds
                    shifts={shifts}
                    centerLat={centerLat}
                    centerLng={centerLng}
                    radiusKm={radiusKm}
                />
                <FocusOnSelected shifts={shifts} selectedShiftId={selectedShiftId} />

                {shifts.map((shift, index) => (
                    <Marker
                        key={shift.id}
                        position={[
                            shift.latitude + (index * 0.0001),
                            shift.longitude + (index * 0.0001)
                        ] as any}
                        icon={icon}
                        eventHandlers={{
                            click: () => onSelect(shift.id)
                        }}
                    >
                        <Popup>
                            {shift.specialty}
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    )
}