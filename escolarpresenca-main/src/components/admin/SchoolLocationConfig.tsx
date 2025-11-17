import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MapContainer, TileLayer, Marker, Circle, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapPin, Locate } from "lucide-react";

// Fix default marker icon
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

const SchoolLocationConfig = () => {
  const [loading, setLoading] = useState(false);
  const [schoolLocation, setSchoolLocation] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    latitude: -23.5505,
    longitude: -46.6333,
    radius_meters: 200,
  });

  useEffect(() => {
    loadSchoolLocation();
  }, []);

  const loadSchoolLocation = async () => {
    const { data, error } = await supabase
      .from("school_location")
      .select("*")
      .maybeSingle();

    if (data) {
      setSchoolLocation(data);
      setFormData({
        name: data.name,
        latitude: data.latitude,
        longitude: data.longitude,
        radius_meters: data.radius_meters,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from("school_location")
        .update({
          name: formData.name,
          latitude: formData.latitude,
          longitude: formData.longitude,
          radius_meters: formData.radius_meters,
        })
        .eq("id", schoolLocation.id);

      if (error) throw error;

      toast.success("Localização da escola atualizada com sucesso!");
      loadSchoolLocation();
    } catch (error) {
      console.error("Erro ao atualizar localização:", error);
      toast.error("Falha ao atualizar localização da escola");
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocalização não suportada pelo navegador");
      return;
    }

    toast.info("Obtendo localização atual...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData({
          ...formData,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        toast.success("Localização atual capturada!");
      },
      (error) => {
        console.error("Erro ao obter localização:", error);
        toast.error("Falha ao obter localização atual. Verifique as permissões.");
      }
    );
  };

  function LocationMarker() {
    useMapEvents({
      click(e) {
        setFormData({
          ...formData,
          latitude: e.latlng.lat,
          longitude: e.latlng.lng,
        });
        toast.info("Localização atualizada no mapa");
      },
    });

    return formData.latitude !== 0 && formData.longitude !== 0 ? (
      <>
        <Marker position={[formData.latitude, formData.longitude]} />
        <Circle
          center={[formData.latitude, formData.longitude]}
          radius={formData.radius_meters}
          pathOptions={{
            color: "hsl(155 60% 50%)",
            fillColor: "hsl(155 60% 50%)",
            fillOpacity: 0.1,
          }}
        />
      </>
    ) : null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          Configuração de Localização da Escola
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Nome da Escola</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="latitude">Latitude</Label>
              <Input
                id="latitude"
                type="number"
                step="any"
                value={formData.latitude}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    latitude: parseFloat(e.target.value) || 0,
                  })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="longitude">Longitude</Label>
              <Input
                id="longitude"
                type="number"
                step="any"
                value={formData.longitude}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    longitude: parseFloat(e.target.value) || 0,
                  })
                }
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="radius">Raio Permitido (metros)</Label>
            <Input
              id="radius"
              type="number"
              value={formData.radius_meters}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  radius_meters: parseInt(e.target.value) || 0,
                })
              }
              required
              min="50"
              max="1000"
            />
            <p className="text-sm text-muted-foreground">
              Alunos dentro deste raio terão presença válida (50-1000m)
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={getCurrentLocation}
            className="w-full"
          >
            <Locate className="mr-2 h-4 w-4" />
            Usar Minha Localização Atual
          </Button>

          <div className="h-96 rounded-lg overflow-hidden border">
            <MapContainer
              center={[formData.latitude, formData.longitude]}
              zoom={15}
              style={{ height: "100%", width: "100%" }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              <LocationMarker />
            </MapContainer>
          </div>

          <p className="text-sm text-muted-foreground">
            💡 Dica: Clique no mapa para definir a localização da escola
          </p>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Salvando..." : "Salvar Configurações"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default SchoolLocationConfig;