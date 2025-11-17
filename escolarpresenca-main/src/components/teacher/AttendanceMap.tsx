import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet";
import { supabase } from "@/integrations/supabase/client";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin } from "lucide-react";

// Fix for default marker icon
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

interface AttendanceMapProps {
  attendances: any[];
}

const AttendanceMap = ({ attendances }: AttendanceMapProps) => {
  const [schoolLocation, setSchoolLocation] = useState<any>(null);

  useEffect(() => {
    loadSchoolLocation();
  }, []);

  const loadSchoolLocation = async () => {
    const { data } = await supabase
      .from("school_location")
      .select("*")
      .single();

    if (data) {
      setSchoolLocation(data);
    }
  };

  if (!schoolLocation) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Mapa de Presenças
          </CardTitle>
          <CardDescription>Carregando localização da escola...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const center: [number, number] = [schoolLocation.latitude, schoolLocation.longitude];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          Mapa de Presenças
        </CardTitle>
        <CardDescription>
          Localização dos alunos presentes hoje (raio de {schoolLocation.radius_meters}m)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg overflow-hidden border h-[400px]">
          <MapContainer
            center={center}
            zoom={16}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {/* School location marker */}
            <Marker position={center}>
              <Popup>
                <div className="font-semibold">
                  {schoolLocation.name}
                  <br />
                  <span className="text-sm text-muted-foreground">Localização da Escola</span>
                </div>
              </Popup>
            </Marker>

            {/* Radius circle */}
            <Circle
              center={center}
              radius={schoolLocation.radius_meters}
              pathOptions={{
                color: "hsl(155 60% 50%)",
                fillColor: "hsl(155 60% 50%)",
                fillOpacity: 0.1,
              }}
            />

            {/* Student attendance markers */}
            {attendances.map((attendance) => (
              <Marker
                key={attendance.id}
                position={[attendance.latitude, attendance.longitude]}
              >
                <Popup>
                  <div>
                    <p className="font-semibold">{attendance.profiles?.full_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {attendance.profiles?.registration_number}
                    </p>
                    <p className="text-sm">Horário: {attendance.attendance_time}</p>
                    <p className="text-sm">
                      Distância: {Math.round(attendance.distance_meters)}m
                    </p>
                    <p className={`text-sm font-semibold ${attendance.is_valid ? 'text-secondary' : 'text-destructive'}`}>
                      {attendance.is_valid ? '✓ Dentro do raio' : '✗ Fora do raio'}
                    </p>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default AttendanceMap;