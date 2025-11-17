import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, Camera, MapPin, Shield } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center space-y-6 mb-16">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-primary">
              <GraduationCap className="w-10 h-10 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground">
            Sistema de Presença Escolar
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Controle automatizado de presença com reconhecimento facial e validação por geolocalização
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button size="lg" onClick={() => navigate("/auth")} className="shadow-lg">
              Acessar Sistema
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/auth")}>
              Criar Conta
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-center mb-4">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <Camera className="w-7 h-7 text-primary" />
                </div>
              </div>
              <CardTitle>Reconhecimento Facial</CardTitle>
              <CardDescription>
                Tecnologia avançada de IA para identificação segura dos alunos
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-center mb-4">
                <div className="w-14 h-14 rounded-full bg-secondary/10 flex items-center justify-center">
                  <MapPin className="w-7 h-7 text-secondary" />
                </div>
              </div>
              <CardTitle>Validação por Localização</CardTitle>
              <CardDescription>
                Confirma que o aluno está próximo à escola durante o registro
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-center mb-4">
                <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center">
                  <Shield className="w-7 h-7 text-accent" />
                </div>
              </div>
              <CardTitle>Seguro e Confiável</CardTitle>
              <CardDescription>
                Dados protegidos e sistema robusto contra fraudes
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        <div className="mt-16 max-w-3xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Como Funciona</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold flex-shrink-0">
                  1
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Cadastro Inicial</h3>
                  <p className="text-sm text-muted-foreground">
                    O aluno cria sua conta e cadastra uma foto do rosto para o sistema aprender suas características faciais.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold flex-shrink-0">
                  2
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Registro de Presença</h3>
                  <p className="text-sm text-muted-foreground">
                    O aluno acessa o sistema e clica em "Registrar Presença". O sistema captura o rosto via câmera.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold flex-shrink-0">
                  3
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Validação Dupla</h3>
                  <p className="text-sm text-muted-foreground">
                    O sistema valida o rosto comparando com a foto cadastrada e verifica se o aluno está próximo à escola.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center font-bold flex-shrink-0">
                  4
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Confirmação</h3>
                  <p className="text-sm text-muted-foreground">
                    A presença é registrada no sistema e o professor pode visualizar em tempo real no painel administrativo.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;