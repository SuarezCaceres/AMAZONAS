export type Category = 'Todos' | 'Ciencia' | 'Arquitectura' | 'Educativo' | 'Inclusivo';

export interface ModelItem {
  id: string;
  title: string;
  category: Exclude<Category, 'Todos'>;
  level: string;
  imageUrl: string;
  description: string;
  materials: string[];
  features: string[];
  rawProduct?: any;
}

export const CATEGORIES: Category[] = ['Todos', 'Ciencia', 'Arquitectura', 'Educativo', 'Inclusivo'];

const defaultFeatures = [
  'Elaborado con materiales sostenibles',
  'Diseno educativo y didactico',
  'Durabilidad garantizada',
  'Hecho a mano con atencion al detalle'
];

export const MODELS: ModelItem[] = [
  {
    id: '1',
    title: 'Sistema Solar 3D',
    category: 'Ciencia',
    level: 'Inicial y primaria',
    imageUrl: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=900&q=80',
    description: 'Maqueta educativa del sistema solar en 3D que representa el Sol y los principales planetas a escala ilustrativa. Ideal para estudiantes de inicial y primaria.',
    materials: ['Carton reciclado', 'Tecnopor', 'Pintura acrilica', 'Materiales reciclables'],
    features: defaultFeatures
  },
  {
    id: '2',
    title: 'Celula Animal o Vegetal',
    category: 'Ciencia',
    level: 'Primaria y secundaria',
    imageUrl: 'https://images.unsplash.com/photo-1530026186672-2cd00ffc50fe?auto=format&fit=crop&w=900&q=80',
    description: 'Maqueta educativa de celula animal o vegetal que incluye sus principales organelos para facilitar el aprendizaje biologico. Ideal para estudiantes de primaria y secundaria.',
    materials: ['Carton reciclado', 'Arcilla', 'Pintura acrilica', 'Materiales reciclables'],
    features: defaultFeatures
  },
  {
    id: '3',
    title: 'Sistema Digestivo',
    category: 'Ciencia',
    level: 'Primaria y secundaria',
    imageUrl: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=900&q=80',
    description: 'Maqueta educativa del sistema digestivo humano que incluye todos los organos principales: boca, esofago, estomago, intestino delgado, intestino grueso, higado y pancreas. Ideal para estudiantes de primaria y secundaria.',
    materials: ['Carton reciclado', 'Arcilla', 'Pintura acrilica', 'Materiales reciclables'],
    features: defaultFeatures
  },
  {
    id: '4',
    title: 'Volcan con Reaccion Quimica',
    category: 'Ciencia',
    level: 'Primaria y secundaria',
    imageUrl: 'https://images.unsplash.com/photo-1619266465172-02a857c3556d?auto=format&fit=crop&w=900&q=80',
    description: 'Maqueta interactiva de volcan disenada para experimentos escolares con reaccion quimica simulada de erupcion. Ideal para estudiantes de primaria y secundaria.',
    materials: ['Carton reciclado', 'Arcilla', 'Pintura acrilica', 'Materiales reciclables'],
    features: defaultFeatures
  },
  {
    id: '5',
    title: 'Casa Ecologica o Sostenible',
    category: 'Arquitectura',
    level: 'Primaria y secundaria',
    imageUrl: 'https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=900&q=80',
    description: 'Maqueta arquitectonica de vivienda ecologica que incorpora elementos sostenibles como paneles solares y areas verdes. Ideal para estudiantes de primaria y secundaria.',
    materials: ['Carton reciclado', 'Madera balsa', 'Pintura acrilica', 'Materiales reciclables'],
    features: defaultFeatures
  },
  {
    id: '6',
    title: 'Edificio o Condominio Moderno',
    category: 'Arquitectura',
    level: 'Universitarios',
    imageUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=900&q=80',
    description: 'Maqueta arquitectonica de edificio o condominio moderno elaborada a escala para representar disenos urbanos and estructurales. Ideal para estudiantes universitarios.',
    materials: ['Carton reciclado', 'Madera balsa', 'Acrilico', 'Pintura acrilica'],
    features: defaultFeatures
  },
  {
    id: '7',
    title: 'Plano Urbano o Mini Ciudad',
    category: 'Arquitectura',
    level: 'Secundaria y universitarios',
    imageUrl: 'https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=900&q=80',
    description: 'Maqueta urbana que representa calles, viviendas, parques y zonas comerciales para comprender la planificacion de ciudades. Ideal para estudiantes de secundaria y universitarios.',
    materials: ['Carton reciclado', 'Madera balsa', 'Pintura acrilica', 'Materiales reciclables'],
    features: defaultFeatures
  },
  {
    id: '8',
    title: 'Puente Estructural',
    category: 'Arquitectura',
    level: 'Secundaria y universitarios',
    imageUrl: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80',
    description: 'Maqueta estructural de puente disenada para demostrar conceptos basicos de ingenieria y resistencia de materiales. Ideal para estudiantes de secundaria y universitarios.',
    materials: ['Madera balsa', 'Carton reciclado', 'Pegamento industrial', 'Pintura acrilica'],
    features: defaultFeatures
  },
  {
    id: '9',
    title: 'Mapa Geografico del Peru',
    category: 'Inclusivo',
    level: 'Primaria',
    imageUrl: 'https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?auto=format&fit=crop&w=900&q=80',
    description: 'Maqueta educativa del mapa del Peru con representacion de regiones y relieve geografico para facilitar el aprendizaje territorial. Ideal para estudiantes de primaria.',
    materials: ['Carton reciclado', 'Foami', 'Pintura acrilica', 'Materiales reciclables'],
    features: defaultFeatures
  },
  {
    id: '10',
    title: 'Civilizaciones Peruanas',
    category: 'Educativo',
    level: 'Primaria y secundaria',
    imageUrl: 'https://images.unsplash.com/photo-1587595431973-160d0d94add1?auto=format&fit=crop&w=900&q=80',
    description: 'Maqueta historica inspirada en civilizaciones peruanas como Chavin, Mochica o Chan Chan, disenada para fortalecer el aprendizaje cultural e historico. Ideal para estudiantes de primaria y secundaria.',
    materials: ['Carton reciclado', 'Arcilla', 'Pintura acrilica', 'Materiales reciclables'],
    features: defaultFeatures
  },
  {
    id: '11',
    title: 'Abecedario o Numeros en Braille',
    category: 'Inclusivo',
    level: 'Inicial y primaria',
    imageUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80',
    description: 'Maqueta inclusiva y tactil del abecedario o numeros en braille disenada para promover el aprendizaje multisensorial. Ideal para estudiantes de inicial y primaria.',
    materials: ['Carton reciclado', 'Foami', 'Material tactil', 'Materiales reciclables'],
    features: defaultFeatures
  },
  {
    id: '12',
    title: 'Sistema Solar Tactil o Relieve Sensorial',
    category: 'Inclusivo',
    level: 'Primaria y secundaria',
    imageUrl: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&w=900&q=80',
    description: 'Maqueta inclusiva del sistema solar con superficies en relieve y elementos tactiles para una experiencia de aprendizaje accesible y sensorial. Ideal para estudiantes de primaria y secundaria.',
    materials: ['Carton reciclado', 'Material tactil', 'Pintura acrilica', 'Materiales reciclables'],
    features: defaultFeatures
  }
];
