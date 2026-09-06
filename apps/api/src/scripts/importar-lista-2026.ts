/**
 * importar-lista-2026.ts — Carga la nómina completa de estudiantes de la gestión
 * 2026 (todos los niveles, compartida por el colegio en dos PDF: la lista de
 * curso y la lista de becas), crea cuenta de estudiante y de padre/tutor para
 * cada uno, agrupa como una sola familia (un solo padre) a los que comparten
 * apellido paterno y materno, y aplica becado/media beca según la lista.
 *
 * Por defecto corre en modo REPORTE (no escribe nada). Para escribir de verdad:
 *   npx tsx src/scripts/importar-lista-2026.ts --commit   (desde apps/api)
 */

import 'dotenv/config'
import { writeFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
import { PrismaClient } from '@prisma/client'

const COMMIT = process.argv.includes('--commit')

const PWD_ESTUDIANTE = 'estudiante2026'
const PWD_PADRE       = 'padre2026'

// ─── Datos: nómina completa (LISTA ACTUAL DE ALUMNOS.pdf) ─────────────────────
// Se excluye "5° A Secundaria": sus 34 alumnos ya existen en el sistema (curso
// usado en la exposición) y ninguno aparece en las listas de becas.

interface AlumnoRaw { paterno: string; materno: string; nombres: string; becado?: true; mediaBeca?: true }
interface CursoRaw { nivel: 'INICIAL' | 'PRIMARIA' | 'SECUNDARIA'; gradoOrden: number; letra: string; alumnos: AlumnoRaw[] }

const CURSOS: CursoRaw[] = [
  {
    nivel: 'INICIAL', gradoOrden: 1, letra: 'A', alumnos: [
      { paterno: 'Ayarachi', materno: 'Tola', nombres: 'Diana Milenka' },
      { paterno: 'Cardozo', materno: 'Chura', nombres: 'David Valentino' },
      { paterno: 'Chambilla', materno: 'Sarcillo', nombres: 'Ariadne Lucia', becado: true },
      { paterno: 'Choque', materno: 'Choquerive', nombres: 'Matias' },
      { paterno: 'Choque', materno: 'Guzman', nombres: 'Isabella Sara' },
      { paterno: 'Choquecota', materno: 'Rios', nombres: 'Mateo Jesus', becado: true },
      { paterno: 'Espinoza', materno: 'Fiorilo', nombres: 'Breyden Leonardo' },
      { paterno: 'Gonzales', materno: 'Tomas', nombres: 'Elizabeth' },
      { paterno: 'Herrera', materno: 'Arteaga', nombres: 'Danner Matias' },
      { paterno: 'Hurtado', materno: 'Cruz', nombres: 'Shara', becado: true },
      { paterno: 'Limachi', materno: 'Molina', nombres: 'Jharyan Edgar' },
      { paterno: 'Mayta', materno: 'Chuquimia', nombres: 'Anthony Adriel' },
      { paterno: 'Medrano', materno: 'Jimenez', nombres: 'Lucas' },
      { paterno: 'Pardo', materno: 'Choque', nombres: 'Tamara' },
      { paterno: 'Quisbert', materno: 'Gonzales', nombres: 'Alaya Nicolette' },
      { paterno: 'Quispe', materno: 'Fernandez', nombres: 'Betuel Lucas' },
      { paterno: 'Reyes', materno: 'Cachi', nombres: 'Danna' },
      { paterno: 'Rodriguez', materno: 'Orellana', nombres: 'Zoe Anthonela' },
      { paterno: 'Rosas', materno: 'Arnez', nombres: 'Lia' },
      { paterno: 'Torrico', materno: 'Terceros', nombres: 'Dickson Jeshua', becado: true },
      { paterno: 'Zurita', materno: 'Huanca', nombres: 'Carlos Julian', becado: true },
    ],
  },
  {
    nivel: 'INICIAL', gradoOrden: 2, letra: 'A', alumnos: [
      { paterno: 'Arteaga', materno: 'Condori', nombres: 'Kendra Antonella' },
      { paterno: 'Caceres', materno: 'Quisbert', nombres: 'Kima Addison' },
      { paterno: 'Catorceno', materno: 'Valencia', nombres: 'Nicolas Liam' },
      { paterno: 'Choque', materno: 'Araoz', nombres: 'Katrina Zoe' },
      { paterno: 'Choque', materno: 'Condo', nombres: 'Dylan German' },
      { paterno: 'Choquecota', materno: 'Rios', nombres: 'Ariana Lidia' },
      { paterno: 'Flores', materno: 'Zarate', nombres: 'Josue Adrian' },
      { paterno: 'Fuentes', materno: 'Zapata', nombres: 'Yamile Zuriela' },
      { paterno: 'Herrera', materno: 'Viza', nombres: 'Iris Maria', becado: true },
      { paterno: 'Landaeta', materno: 'Lea', nombres: 'Gabriel' },
      { paterno: 'Mariño', materno: 'Condori', nombres: 'Zoe Valentina' },
      { paterno: 'Paco', materno: 'Reyes', nombres: 'Khyara Arleth' },
      { paterno: 'Paredes', materno: 'Villazon', nombres: 'Gael Tadashi' },
      { paterno: 'Silvestre', materno: 'Choque', nombres: 'Diana', becado: true },
      { paterno: 'Tomas', materno: 'Fuentes', nombres: 'Caleb' },
      { paterno: 'Velarde', materno: 'Vargas', nombres: 'Anelisse Victoria', becado: true },
      { paterno: 'Zeballos', materno: 'Merida', nombres: 'Aylin' },
    ],
  },
  {
    nivel: 'PRIMARIA', gradoOrden: 1, letra: 'A', alumnos: [
      { paterno: 'Alaniz', materno: 'Yucra', nombres: 'Jhojan' },
      { paterno: 'Arancibia', materno: 'Orellana', nombres: 'Priyanka Lenncy' },
      { paterno: 'Auca', materno: 'Ticona', nombres: 'Sebastian Gabriel' },
      { paterno: 'Balderrama', materno: 'Carballo', nombres: 'Thiago Alejandro' },
      { paterno: 'Cabezas', materno: 'Condori', nombres: 'Jhon Alexis' },
      { paterno: 'Canqui', materno: 'Garcia', nombres: 'Luis Patricio' },
      { paterno: 'Choque', materno: 'Rojas', nombres: 'Thiago Josue' },
      { paterno: 'Choque', materno: 'Vargas', nombres: 'Dilan Jesus', becado: true },
      { paterno: 'Coaquira', materno: 'Copa', nombres: 'Josue Irving', becado: true },
      { paterno: 'Condori', materno: 'Gomez', nombres: 'Nijan Karol' },
      { paterno: 'Corpa', materno: 'Callapa', nombres: 'Oscar Mateo' },
      { paterno: 'Escalera', materno: 'Escalera', nombres: 'Marcelo Henry' },
      { paterno: 'Escalera', materno: 'Perez', nombres: 'Zoe Sharlott' },
      { paterno: 'Fernandez', materno: 'Cespedes', nombres: 'Yamile' },
      { paterno: 'Fernandez', materno: 'Vallejos', nombres: 'Britthany Zirel' },
      { paterno: 'Flores', materno: 'Mamani', nombres: 'Moises' },
      { paterno: 'Gonzales', materno: 'Villarpando', nombres: 'Iker Alessandro' },
      { paterno: 'Hurtado', materno: 'Choque', nombres: 'Zarely Zoemi', mediaBeca: true },
      { paterno: 'Iriarte', materno: 'Rojas', nombres: 'Santiago Brian' },
      { paterno: 'Llaveta', materno: 'Hinojosa', nombres: 'Mario Gael' },
      { paterno: 'Lopez', materno: 'Matias', nombres: 'Daniel Isturiz' },
      { paterno: 'Machicado', materno: 'Huaranca', nombres: 'Molly Antonella', becado: true },
      { paterno: 'Mamani', materno: 'Cahuaya', nombres: 'Vania Fernanda' },
      { paterno: 'Mamani', materno: 'Espinoza', nombres: 'Dafne Ester' },
      { paterno: 'Marca', materno: 'Evia', nombres: 'Rubi' },
      { paterno: 'Medrano', materno: 'Arroyo', nombres: 'Jhossep Farid' },
      { paterno: 'Mesa', materno: 'Bautista', nombres: 'Zoe Isabella' },
      { paterno: 'Minaya', materno: 'Molloricon', nombres: 'Adiel Anthony' },
      { paterno: 'Montaño', materno: 'Mamani', nombres: 'Ian Luan' },
      { paterno: 'Muruchi', materno: 'Jarpa', nombres: 'Paula Marely' },
      { paterno: 'Perez', materno: 'Incata', nombres: 'Lucas Ezequiel' },
      { paterno: 'Puma', materno: 'Vasquez', nombres: 'Jose Luis' },
      { paterno: 'Vaca', materno: 'Romero', nombres: 'Dominic Ezequiel' },
      { paterno: 'Vasquez', materno: 'Choque', nombres: 'Isamar Valeria' },
      { paterno: 'Vasquez', materno: 'Olguin', nombres: 'Sophie Alaia' },
      { paterno: 'Zacarias', materno: 'Navia', nombres: 'Sebastian Diego' },
    ],
  },
  {
    nivel: 'PRIMARIA', gradoOrden: 2, letra: 'A', alumnos: [
      { paterno: 'Alvarado', materno: 'Vadillo', nombres: 'Anely Nazareth' },
      { paterno: 'Ayarachi', materno: 'Tola', nombres: 'Coraline Milenka' },
      { paterno: 'Ayaviri', materno: 'Quispe', nombres: 'Alexander Jhamil' },
      { paterno: 'Belen', materno: 'Lazarte', nombres: 'Emanuel Josue' },
      { paterno: 'Benavides', materno: 'Loayza', nombres: 'Jhim Victor' },
      { paterno: 'Cabrera', materno: 'Luizaga', nombres: 'Mariana' },
      { paterno: 'Cabrera', materno: 'Zuñiga', nombres: 'Nataly Glennys', becado: true },
      { paterno: 'Canaza', materno: 'Chinche', nombres: 'Genesis Nicoleth' },
      { paterno: 'Canchari', materno: 'Ancari', nombres: 'Eidan Leonardo' },
      { paterno: 'Claros', materno: 'Fernandez', nombres: 'Benjamin Carlos', becado: true },
      { paterno: 'Colque', materno: 'Jimenez', nombres: 'Ashley Mikaela' },
      { paterno: 'Cruz', materno: 'Torrez', nombres: 'Thyago' },
      { paterno: 'Gonzales', materno: 'Tordoya', nombres: 'Mathias Abdiel' },
      { paterno: 'Hurtado', materno: 'Choque', nombres: 'Yerick Kalep' },
      { paterno: 'Jimpol', materno: 'Prado', nombres: 'Valentina' },
      { paterno: 'Porras', materno: 'Lupe', nombres: 'Megaly' },
      { paterno: 'Quispe', materno: 'Gamboa', nombres: 'Gael Carmelo' },
      { paterno: 'Quispe', materno: 'Quispe', nombres: 'Eynar Snayder' },
      { paterno: 'Rojas', materno: 'Peñaloza', nombres: 'Jhair', becado: true },
      { paterno: 'Rojas', materno: 'Peñaloza', nombres: 'Jhamil' },
      { paterno: 'Soto', materno: 'Saygua', nombres: 'Eidan Khaled' },
      { paterno: 'Torrico', materno: 'Terceros', nombres: 'Gael Santino' },
      { paterno: 'Turpo', materno: 'Paredez', nombres: 'Dasha', becado: true },
      { paterno: 'Vega', materno: 'Escobar', nombres: 'Angel Matias' },
      { paterno: 'Verduguez', materno: 'Zambrana', nombres: 'Samantha Ariana' },
      { paterno: 'Villca', materno: 'Mariaca', nombres: 'Brenda Samantha' },
      { paterno: 'Yucra', materno: 'Huanca', nombres: 'Lia Scarllet' },
    ],
  },
  {
    nivel: 'PRIMARIA', gradoOrden: 2, letra: 'B', alumnos: [
      { paterno: 'Alarcon', materno: 'Limachi', nombres: 'Alejandra Milagros' },
      { paterno: 'Alegre', materno: 'Orosco', nombres: 'Clara Sofia' },
      { paterno: 'Ari', materno: 'Quiroga', nombres: 'Anahi Emily' },
      { paterno: 'Aviles', materno: 'Meneces', nombres: 'Elam Samara' },
      { paterno: 'Bejarano', materno: 'Menacho', nombres: 'Franco' },
      { paterno: 'Calizaya', materno: 'Choque', nombres: 'Dylan' },
      { paterno: 'Camacho', materno: 'Garnica', nombres: 'Ayar Julian' },
      { paterno: 'Cosme', materno: 'Chambi', nombres: 'Jhucel Iker', becado: true },
      { paterno: 'Eulate', materno: 'Lafuente', nombres: 'Liam Fabricio' },
      { paterno: 'Felipe', materno: 'Espinoza', nombres: 'Valentina' },
      { paterno: 'Loayza', materno: 'Carballo', nombres: 'Kilian' },
      { paterno: 'Lopez', materno: 'Matias', nombres: 'Jhon Daziel' },
      { paterno: 'Machicado', materno: 'Huaranca', nombres: 'Bruno Maximiliano' },
      { paterno: 'Mamani', materno: 'Portillo', nombres: 'Nicolas Angelo' },
      { paterno: 'Mamani', materno: 'Vargas', nombres: 'Jhissel' },
      { paterno: 'Marca', materno: 'Choque', nombres: 'Ashelem Tatiana' },
      { paterno: 'Marza', materno: 'Marza', nombres: 'Diana Itzel' },
      { paterno: 'Mendoza', materno: 'Zurita', nombres: 'Mathias Jorge' },
      { paterno: 'Rioja', materno: 'Sanchez', nombres: 'Oliver Grover' },
      { paterno: 'Rojas', materno: 'Ipurani', nombres: 'Joaquin De Jesus' },
      { paterno: 'Tomas', materno: 'Huanca', nombres: 'Ashly Arleth' },
      { paterno: 'Torrez', materno: 'Marca', nombres: 'Iker Matias' },
      { paterno: 'Vasquez', materno: 'Ponce', nombres: 'Esther Adalys' },
      { paterno: 'Condori', materno: 'Calderon', nombres: 'Andre Jhulian', mediaBeca: true }, // solo en BECAS LISTAS.pdf, confirmado por secretaría
    ],
  },
  {
    nivel: 'PRIMARIA', gradoOrden: 3, letra: 'A', alumnos: [
      { paterno: 'Ajhuacho', materno: 'Felipe', nombres: 'Russell Josue' },
      { paterno: 'Ajhuacho', materno: 'Hinojosa', nombres: 'Mia Celin' },
      { paterno: 'Alarcon', materno: 'Limachi', nombres: 'Hambar Melani' },
      { paterno: 'Atanacio', materno: 'Garcia', nombres: 'Jaszeel Cretcel' },
      { paterno: 'Ayala', materno: 'Canceco', nombres: 'Itzel Nicolle' },
      { paterno: 'Canaviri', materno: 'Cruz', nombres: 'Isa Génesis' },
      { paterno: 'Cano', materno: 'Cruz', nombres: 'Cristopher Darell' },
      { paterno: 'Coaquira', materno: 'Copa', nombres: 'Jade Belen' },
      { paterno: 'Condori', materno: 'Pacoricona', nombres: 'Lian Daineris' },
      { paterno: 'Gabriel', materno: 'Baltazar', nombres: 'Kenny Edward' },
      { paterno: 'Gonzales', materno: 'Villarpando', nombres: 'Lionel Andre' },
      { paterno: 'Herrera', materno: 'Viza', nombres: 'Jheremy Santiago' },
      { paterno: 'Hurtado', materno: 'Cruz', nombres: 'Danna' },
      { paterno: 'Mamani', materno: 'Fernandez', nombres: 'Nicolas Mateo' },
      { paterno: 'Mamani', materno: 'Villca', nombres: 'Jafed Kenny' },
      { paterno: 'Mesa', materno: 'Bautista', nombres: 'Matias' },
      { paterno: 'Minaya', materno: 'Guevara', nombres: 'Jhisel Suna' },
      { paterno: 'Nogales', materno: 'Paco', nombres: 'Mayerlin Marian' },
      { paterno: 'Nova', materno: 'Garcia', nombres: 'Carlos Augusto' },
      { paterno: 'Ortiz', materno: 'Ayala', nombres: 'Liam Edgar' },
      { paterno: 'Paco', materno: 'Guevara', nombres: 'Flavia Alexa', becado: true },
      { paterno: 'Quisbert', materno: 'Gonzales', nombres: 'Aaron Reynaldo' },
      { paterno: 'Saravia', materno: 'Llave', nombres: 'Monserrat Micaela' },
      { paterno: 'Yavi', materno: 'Colque', nombres: 'Iam Keyden' },
    ],
  },
  {
    nivel: 'PRIMARIA', gradoOrden: 4, letra: 'A', alumnos: [
      { paterno: 'Ajhuacho', materno: 'Villca', nombres: 'Brisa Alison' },
      { paterno: 'Albarado', materno: 'Alvarado', nombres: 'Nareth Ariana' },
      { paterno: 'Balderrama', materno: 'Ali', nombres: 'Naciel Nataly' },
      { paterno: 'Bellot', materno: 'Escobar', nombres: 'Eithan Herminio', becado: true },
      { paterno: 'Burgos', materno: 'Barco', nombres: 'Sebastian' },
      { paterno: 'Cabrera', materno: 'Zuñiga', nombres: 'Kate Florence' },
      { paterno: 'Canaviri', materno: 'Paniagua', nombres: 'Mateo Russell' },
      { paterno: 'Castro', materno: 'Quispe', nombres: 'Shaylin Flor' },
      { paterno: 'Cespedes', materno: 'Laime', nombres: 'Maya Alejandra' },
      { paterno: 'Chambi', materno: 'Aguilar', nombres: 'Leyla Zareth' },
      { paterno: 'Chirari', materno: 'Teran', nombres: 'Shaira Belen' },
      { paterno: 'Choque', materno: 'Guzman', nombres: 'Mayte Ariana' },
      { paterno: 'Choque', materno: 'Mamani', nombres: 'Laura Belinda' },
      { paterno: 'Escobar', materno: 'Kanahuaty', nombres: 'Mattias Alfonso' },
      { paterno: 'Fernandez', materno: 'Lucana', nombres: 'Matias Assael' },
      { paterno: 'Flores', materno: 'Mamani', nombres: 'Luna Victoria', becado: true },
      { paterno: 'Garcia', materno: 'Hinojosa', nombres: 'Vincent Antony' },
      { paterno: 'Herrera', materno: 'Alaca', nombres: 'Thiago Gareth' },
      { paterno: 'Huanca', materno: 'Mamani', nombres: 'Reishel Alexia' },
      { paterno: 'Hurtado', materno: 'Cruz', nombres: 'Fabiana' },
      { paterno: 'Jimpol', materno: 'Prado', nombres: 'Agustin Matias' },
      { paterno: 'Laka', materno: 'Nina', nombres: 'Cielo' },
      { paterno: 'Limachi', materno: 'Huanca', nombres: 'Emilio Alfredo', becado: true },
      { paterno: 'Mamani', materno: 'Ari', nombres: 'Fernanda Ruby' },
      { paterno: 'Mamani', materno: 'Mamani', nombres: 'Matias Daniel' },
      { paterno: 'Meneses', materno: 'Valencia', nombres: 'Marinet', becado: true },
      { paterno: 'Perez', materno: 'Ticona', nombres: 'Lian Mateo' },
      { paterno: 'Quispe', materno: 'Vasquez', nombres: 'William Misael' },
      { paterno: 'Reyes', materno: 'Montaño', nombres: 'Carlos Edward' },
      { paterno: 'Rodriguez', materno: 'Torres', nombres: 'Brisa Briana' },
      { paterno: 'Soto', materno: 'Choque', nombres: 'Katrina Antonella' },
      { paterno: 'Taquichiri', materno: 'Vargas', nombres: 'Lucas Thiago' },
      { paterno: 'Vargas', materno: 'Cespedes', nombres: 'Regina Sasha', mediaBeca: true },
      { paterno: 'Vargas', materno: 'Garnica', nombres: 'Yuan' },
      { paterno: 'Vargas', materno: 'Sillerico', nombres: 'Nikolett Antonella' },
      { paterno: 'Veizaga', materno: 'Toranzo', nombres: 'Axel Mayer' },
    ],
  },
  {
    nivel: 'PRIMARIA', gradoOrden: 5, letra: 'A', alumnos: [
      { paterno: 'Aguilar', materno: 'Huanca', nombres: 'Jhamel Jeremy' },
      { paterno: 'Arispe', materno: 'Jimenez', nombres: 'Yamil Martial' },
      { paterno: 'Atanacio', materno: 'Garcia', nombres: 'Paola Maria' },
      { paterno: 'Ayaviri', materno: 'Quispe', nombres: 'Lia Fernanda' },
      { paterno: 'Belen', materno: 'Lazarte', nombres: 'Andre Liam' },
      { paterno: 'Bernal', materno: 'Ayaviri', nombres: 'Jhojan Matias', becado: true },
      { paterno: 'Buendia', materno: 'Delgadillo', nombres: 'Ian Zein' },
      { paterno: 'Burgos', materno: 'Claros', nombres: 'Arlet', becado: true },
      { paterno: 'Chambi', materno: 'Aguilar', nombres: 'Santiago Elias' },
      { paterno: 'Choque', materno: 'Martinez', nombres: 'Abdiel' },
      { paterno: 'Chura', materno: 'Villa', nombres: 'Wara Valentina', becado: true },
      { paterno: 'Condarco', materno: 'Villanueva', nombres: 'Thiago Nicolas' },
      { paterno: 'Cosme', materno: 'Chambi', nombres: 'Yamil Edwin' },
      { paterno: 'Fernandez', materno: 'Condori', nombres: 'Renart Fernan' },
      { paterno: 'Fernandez', materno: 'Valencia', nombres: 'Lukaz' },
      { paterno: 'Gomez', materno: 'Rivera', nombres: 'Alison Ghisel' },
      { paterno: 'Gonzales', materno: 'Corrales', nombres: 'Tatiana Madelen Tamara' },
      { paterno: 'Gonzales', materno: 'Tomas', nombres: 'Adriana' },
      { paterno: 'Gonzales', materno: 'Vidal', nombres: 'Sofia Natalia' },
      { paterno: 'Jora', materno: 'Tupa', nombres: 'Cristian Lee' },
      { paterno: 'Martinez', materno: 'Ticona', nombres: 'Adriana Valentina' },
      { paterno: 'Mendoza', materno: 'Gomez', nombres: 'Soraya Irene', becado: true },
      { paterno: 'Montaño', materno: 'Mamani', nombres: 'Gerald Santiago' },
      { paterno: 'Muruchi', materno: 'Jarpa', nombres: 'Maylin Ariadne' },
      { paterno: 'Nina', materno: 'Flores', nombres: 'Angela Valeria' },
      { paterno: 'Orozco', materno: 'Burgos', nombres: 'Dylan' },
      { paterno: 'Rojas', materno: 'Medrano', nombres: 'Pablo Santiago' },
      { paterno: 'Sanchez', materno: 'Soria', nombres: 'Matias' },
      { paterno: 'Torrico', materno: 'Terceros', nombres: 'Giselle Maitane' },
      { paterno: 'Vaca', materno: 'Romero', nombres: 'Antonella Guadalupe' },
      { paterno: 'Viza', materno: 'Fernandez', nombres: 'Ayelin Jhansel' },
      { paterno: 'Zurita', materno: 'Huanca', nombres: 'Carlos Alejandro' },
    ],
  },
  {
    nivel: 'PRIMARIA', gradoOrden: 6, letra: 'A', alumnos: [
      { paterno: 'Alvarez', materno: 'Borda', nombres: 'Kenneth Eithan' },
      { paterno: 'Antezana', materno: 'Mendoza', nombres: 'Adalid Alejandro' },
      { paterno: 'Arispe', materno: 'Cadiz', nombres: 'Thiago Airton' },
      { paterno: 'Aruni', materno: 'Quispe', nombres: 'David Emanuel' },
      { paterno: 'Castro', materno: 'Caro', nombres: 'Osmar Ulises' },
      { paterno: 'Catorceno', materno: 'Valencia', nombres: 'Luciana Valery' },
      { paterno: 'Cespedes', materno: 'Laime', nombres: 'Isaias Leonel' },
      { paterno: 'Choque', materno: 'Choquerive', nombres: 'Abigail' },
      { paterno: 'Conde', materno: 'Paqui', nombres: 'Sindel' },
      { paterno: 'Cuani', materno: 'Franco', nombres: 'Helen Karina' },
      { paterno: 'Dorado', materno: 'Cruz', nombres: 'Sergio Andre' },
      { paterno: 'Enriquez', materno: 'Quispe', nombres: 'Abril Brytani' },
      { paterno: 'Fernandez', materno: 'Lizarazo', nombres: 'Valentina Romina' },
      { paterno: 'Flores', materno: 'Huallpa', nombres: 'Genesis Jhireh' },
      { paterno: 'Guillen', materno: 'Copa', nombres: 'Jheremy David' },
      { paterno: 'Guzman', materno: 'Tenorio', nombres: 'Gueiza Micaela' },
      { paterno: 'Herrera', materno: 'Viza', nombres: 'Jhair Lionel' },
      { paterno: 'Hinojosa', materno: 'Moreira', nombres: 'Gael Dylan' },
      { paterno: 'Huanca', materno: 'Almendras', nombres: 'Mia Mishel' },
      { paterno: 'Limachi', materno: 'Huanca', nombres: 'Daniela Anahi' },
      { paterno: 'Lucas', materno: 'Ayaviri', nombres: 'Jose Miguel' },
      { paterno: 'Mamani', materno: 'Rios', nombres: 'Abigail Selina' },
      { paterno: 'Motiño', materno: 'Quenta', nombres: 'April Deyanire' },
      { paterno: 'Orellana', materno: 'Ovando', nombres: 'Santiago Jhair' },
      { paterno: 'Paco', materno: 'Guevara', nombres: 'Antonella Mariel', becado: true },
      { paterno: 'Palenque', materno: 'Rosas', nombres: 'Daniel' },
      { paterno: 'Perez', materno: 'Incata', nombres: 'Keylor Santiago' },
      { paterno: 'Pizarro', materno: 'Quispe', nombres: 'Helen Deysy' },
      { paterno: 'Ramirez', materno: 'Cespedes', nombres: 'Diana Mercedes' },
      { paterno: 'Ramos', materno: 'Flores', nombres: 'Brandon' },
      { paterno: 'Ramos', materno: 'Gaspar', nombres: 'Sebastian' },
      { paterno: 'Santivañez', materno: 'Gutierrez', nombres: 'Mateo Carlos' },
      { paterno: 'Tomas', materno: 'Huanca', nombres: 'Thiago Joseph' },
      { paterno: 'Totora', materno: 'Flores', nombres: 'James Kervin' },
      { paterno: 'Tunquipa', materno: 'Tinta', nombres: 'Jhosan Sebastian' },
      { paterno: 'Turpo', materno: 'Paredez', nombres: 'Rusel' },
      { paterno: 'Ventura', materno: 'Ancari', nombres: 'Yeison James' },
      { paterno: 'Zenteno', materno: 'Delgado', nombres: 'Redwan' },
      { paterno: 'Solis', materno: 'Herrera', nombres: 'Neithan Andre', becado: true }, // solo en BECAS LISTAS.pdf, confirmado por secretaría
      { paterno: 'Vidal', materno: 'Campos', nombres: 'Jasmin Dannae', becado: true }, // solo en BECAS LISTAS.pdf, confirmado por secretaría
    ],
  },
  {
    nivel: 'SECUNDARIA', gradoOrden: 1, letra: 'A', alumnos: [
      { paterno: '', materno: 'Mamani', nombres: 'Mark Edisson' }, // dato incompleto en el PDF (sin apellido paterno) — revisar con secretaría
      { paterno: 'Aguilar', materno: 'Garnica', nombres: 'Kendra Maite' },
      { paterno: 'Alborta', materno: 'Fernandez', nombres: 'Matias Shaiel' },
      { paterno: 'Arispe', materno: 'Jimenez', nombres: 'Daniel Leonel' },
      { paterno: 'Astroña', materno: 'Gutierrez', nombres: 'Jhair Vladi' },
      { paterno: 'Astroña', materno: 'Ramos', nombres: 'Alan Mijhael' },
      { paterno: 'Ayala', materno: 'Perez', nombres: 'Damaris Abigail' },
      { paterno: 'Balderrama', materno: 'Carballo', nombres: 'Jose Mateo' },
      { paterno: 'Calizaya', materno: 'Choque', nombres: 'Jhair' },
      { paterno: 'Choque', materno: 'Huanca', nombres: 'Sol Valentina' },
      { paterno: 'Condarco', materno: 'Villanueva', nombres: 'Magdyel Adriana' },
      { paterno: 'Cornejo', materno: 'Rocha', nombres: 'Mariana Valeria' },
      { paterno: 'Cosme', materno: 'Chambi', nombres: 'Leidy Belen' },
      { paterno: 'Dominguez', materno: 'Mamani', nombres: 'Ruth Amy Lee' },
      { paterno: 'Espinoza', materno: 'Laime', nombres: 'Axel Fabrizio' },
      { paterno: 'Garron', materno: 'Terrazas', nombres: 'Harold Ronald' },
      { paterno: 'Gonzales', materno: 'Ortiz', nombres: 'Brianna Peytton' },
      { paterno: 'Guevara', materno: 'Siles', nombres: 'Kaled' },
      { paterno: 'Guisbert', materno: 'Lazcano', nombres: 'Glen Misael' },
      { paterno: 'Mendoza', materno: 'Gomez', nombres: 'Hector Ricardo' },
      { paterno: 'Paco', materno: 'Reyes', nombres: 'Sarai Maylen' },
      { paterno: 'Paredes', materno: 'Zurita', nombres: 'Kelly' },
      { paterno: 'Patiño', materno: 'Carballo', nombres: 'Jherick Eduard' },
      { paterno: 'Porco', materno: 'Crespo', nombres: 'Alan Alfredo' },
      { paterno: 'Quispe', materno: 'Grageda', nombres: 'Danis Ariana' },
      { paterno: 'Reyes', materno: 'Cachi', nombres: 'Diego' },
      { paterno: 'Rocha', materno: 'Callao', nombres: 'Micaela' },
      { paterno: 'Rojas', materno: 'Lafuente', nombres: 'Maxwell' },
      { paterno: 'Rojas', materno: 'Peñaloza', nombres: 'Jhian Carlos' },
      { paterno: 'Terrazas', materno: 'Rodriguez', nombres: 'Juan Ian', becado: true },
      { paterno: 'Torrez', materno: 'Claure', nombres: 'Mayra Jazmin' },
      { paterno: 'Torrico', materno: 'Andrade', nombres: 'Antonella Ariana' },
      { paterno: 'Trigo', materno: 'Machaca', nombres: 'Jheremy Jesus' },
      { paterno: 'Vargas', materno: 'Cespedes', nombres: 'Iker Beymar' },
      { paterno: 'Vasquez', materno: 'Angulo', nombres: 'Frida', becado: true },
      { paterno: 'Villca', materno: 'Choque', nombres: 'Jhon Reyvi' },
      { paterno: 'Yavi', materno: 'Colque', nombres: 'Solange Constanza' },
      { paterno: 'Zambrana', materno: 'Careaga', nombres: 'Ciel Isabella' },
    ],
  },
  {
    nivel: 'SECUNDARIA', gradoOrden: 2, letra: 'A', alumnos: [
      { paterno: 'Alvarez', materno: 'Borda', nombres: 'Katherine Clair' },
      { paterno: 'Arias', materno: 'Grageda', nombres: 'Raul Benjamin' },
      { paterno: 'Aviles', materno: 'Delgado', nombres: 'Anny Mikeyla' },
      { paterno: 'Baldiviezo', materno: 'Maita', nombres: 'Itzel Antonela' },
      { paterno: 'Bautista', materno: 'Huanca', nombres: 'Juan Diego' },
      { paterno: 'Bellot', materno: 'Escobar', nombres: 'Aaron' },
      { paterno: 'Campos', materno: 'Condori', nombres: 'Jhon Angel' },
      { paterno: 'Choque', materno: 'Rodriguez', nombres: 'Edward Thiago' },
      { paterno: 'Chura', materno: 'Villa', nombres: 'Lucero Paola' },
      { paterno: 'Claros', materno: 'Veizaga', nombres: 'Nicol Katherin', becado: true },
      { paterno: 'Coca', materno: 'Zerda', nombres: 'Damaris Fabiana' },
      { paterno: 'Cocarico', materno: 'Toco', nombres: 'John Geremi' },
      { paterno: 'Coria', materno: 'Zenteno', nombres: 'Leire Nashira' },
      { paterno: 'Cruz', materno: 'Guzman', nombres: 'Max Santiago' },
      { paterno: 'Fernandez', materno: 'Alarcon', nombres: 'Maria De Los Angeles' },
      { paterno: 'Fernandez', materno: 'Pinaya', nombres: 'Brenda' },
      { paterno: 'Flores', materno: 'Gutierrez', nombres: 'Jael Jonathan' },
      { paterno: 'Flores', materno: 'Mamani', nombres: 'Joel Ernesto' },
      { paterno: 'Gutierrez', materno: 'Coca', nombres: 'Jhanilen Sarai' },
      { paterno: 'Huanca', materno: 'Cortez', nombres: 'Ignacio Jesus' },
      { paterno: 'Illanes', materno: 'Antezana', nombres: 'Gabriel Ruben' },
      { paterno: 'Leigue', materno: 'Paredes', nombres: 'Keila Kataleya' },
      { paterno: 'Machicado', materno: 'Huaranca', nombres: 'Anabel' },
      { paterno: 'Mamani', materno: 'Espinoza', nombres: 'Cecia Galilea' },
      { paterno: 'Maya', materno: 'Ledezma', nombres: 'Andres' },
      { paterno: 'Ortiz', materno: 'Saigua', nombres: 'Roybell Saim' },
      { paterno: 'Paco', materno: 'Guevara', nombres: 'Eiza Ghia' },
      { paterno: 'Paredes', materno: 'Mamani', nombres: 'Ariana Sarahi' },
      { paterno: 'Rondo', materno: 'Cazorla', nombres: 'Marioly Teylor' },
      { paterno: 'Silvestre', materno: 'Choque', nombres: 'Ariana Scarlett' },
      { paterno: 'Terrazas', materno: 'Rodriguez', nombres: 'Dariel Anghelo' },
      { paterno: 'Torrico', materno: 'Loza', nombres: 'Nicol Guadalupe' },
      { paterno: 'Torrico', materno: 'Ramirez', nombres: 'Edison Andre' },
      { paterno: 'Turpo', materno: 'Paredez', nombres: 'Luna Michel' },
      { paterno: 'Vargas', materno: 'Foronda', nombres: 'Rivana Michelle' },
      { paterno: 'Zambrana', materno: 'Corino', nombres: 'Aileen Teofila' },
    ],
  },
  {
    nivel: 'SECUNDARIA', gradoOrden: 3, letra: 'A', alumnos: [
      { paterno: 'Aguilar', materno: 'Condori', nombres: 'Luciana' },
      { paterno: 'Alarcon', materno: 'Limachi', nombres: 'Brandon David' },
      { paterno: 'Camacho', materno: 'Mariaca', nombres: 'Jhennifer Guadalupe' },
      { paterno: 'Canedo', materno: 'Quezada', nombres: 'Aaron Nicolas' },
      { paterno: 'Chambilla', materno: 'Sarcillo', nombres: 'Marc Leonel' },
      { paterno: 'Choque', materno: 'Vargas', nombres: 'Wilson' },
      { paterno: 'Condori', materno: 'Quispe', nombres: 'Genesis Valeria' },
      { paterno: 'Copali', materno: 'Bolivar', nombres: 'Valentina', becado: true },
      { paterno: 'Franco', materno: 'Choque', nombres: 'Alejandro' },
      { paterno: 'Franco', materno: 'Guzman', nombres: 'Jheremy' },
      { paterno: 'Huañapaco', materno: 'Choque', nombres: 'Helen Ibeth' },
      { paterno: 'Hurtado', materno: 'Montaño', nombres: 'Maria Belen' },
      { paterno: 'Jimenez', materno: 'Perez', nombres: 'Brandon' },
      { paterno: 'Jora', materno: 'Cata', nombres: 'Maiber' },
      { paterno: 'Lopez', materno: 'Lafuente', nombres: 'Ivar Daniel' },
      { paterno: 'Mamani', materno: 'Pascual', nombres: 'Jeancarlos' },
      { paterno: 'Mejia', materno: 'Pedraza', nombres: 'Jhoana Salome' },
      { paterno: 'Mendoza', materno: 'Zurita', nombres: 'Luis Carlos' },
      { paterno: 'Meneces', materno: 'Iriarte', nombres: 'Jhojan Benjhy' },
      { paterno: 'Meneses', materno: 'Valencia', nombres: 'Daner' },
      { paterno: 'Oliva', materno: 'Arreaño', nombres: 'Camila Leonor' },
      { paterno: 'Quenta', materno: 'Lucana', nombres: 'Brandon Sairo' },
      { paterno: 'Rivamontan', materno: 'Lampa', nombres: 'Maria Martha' },
      { paterno: 'Rosas', materno: 'Arnez', nombres: 'Brania' },
      { paterno: 'Solis', materno: 'Herrera', nombres: 'Maik' },
      { paterno: 'Taquichiri', materno: 'Cruz', nombres: 'Nicolas' },
      { paterno: 'Terceros', materno: 'Caro', nombres: 'Mayumi Melani' },
      { paterno: 'Terrazas', materno: 'Rodriguez', nombres: 'Rossemary Nicol' },
      { paterno: 'Trigo', materno: 'Machaca', nombres: 'Katrin Abigahil' },
      { paterno: 'Vargas', materno: 'Arancibia', nombres: 'Araceli' },
    ],
  },
  {
    nivel: 'SECUNDARIA', gradoOrden: 4, letra: 'A', alumnos: [
      { paterno: '', materno: 'Vidal', nombres: 'Sebastian' }, // dato incompleto en el PDF (sin apellido paterno) — revisar con secretaría
      { paterno: 'Aponte', materno: 'Revollo', nombres: 'Aaron Matias' },
      { paterno: 'Ayaviri', materno: 'Veliz', nombres: 'Leoncio Alexis' },
      { paterno: 'Bellot', materno: 'Escobar', nombres: 'Gerald Alexander' },
      { paterno: 'Bernal', materno: 'Ayaviri', nombres: 'Brandon Mateo' },
      { paterno: 'Choque', materno: 'Condo', nombres: 'Darling Sofia' },
      { paterno: 'Choque', materno: 'Martinez', nombres: 'Brandon' },
      { paterno: 'Escobar', materno: 'Kanahuaty', nombres: 'Pablo Antonio' },
      { paterno: 'Fernandez', materno: 'Choque', nombres: 'Fabio Raul' },
      { paterno: 'Fernandez', materno: 'Condori', nombres: 'Rodrigo Marcel' },
      { paterno: 'Gonzales', materno: 'Corrales', nombres: 'Melany Nuria' },
      { paterno: 'Ibarra', materno: 'Mamani', nombres: 'Dayana' },
      { paterno: 'Mendoza', materno: 'Gomez', nombres: 'Katherine Alejandra' },
      { paterno: 'Morales', materno: 'Jimenez', nombres: 'Nicolas' },
      { paterno: 'Ortiz', materno: 'Saigua', nombres: 'Mel Antony' },
      { paterno: 'Porras', materno: 'Lupe', nombres: 'Keyla' },
      { paterno: 'Rojas', materno: 'Vergara', nombres: 'Rodrigo Karim' },
      { paterno: 'Totora', materno: 'Flores', nombres: 'Airton Marcelo Joau' },
      { paterno: 'Vasquez', materno: 'Angulo', nombres: 'Aldrin' },
      { paterno: 'Vasquez', materno: 'Maque', nombres: 'David Oliver' },
      { paterno: 'Villan', materno: 'Mamani', nombres: 'Saul Richard' },
    ],
  },
  {
    nivel: 'SECUNDARIA', gradoOrden: 4, letra: 'B', alumnos: [
      { paterno: 'Cabezas', materno: 'Condori', nombres: 'Yamelin' },
      { paterno: 'Campos', materno: 'Manu', nombres: 'Esther Valentina' },
      { paterno: 'Guaman', materno: 'Torrez', nombres: 'Camila' },
      { paterno: 'Herbas', materno: 'Luizaga', nombres: 'Melani' },
      { paterno: 'Huanca', materno: 'Cortez', nombres: 'Fatima Sofia' },
      { paterno: 'Limachi', materno: 'Huanca', nombres: 'Maria Jose' },
      { paterno: 'Lopez', materno: 'Lopez', nombres: 'Kevin Brandon' },
      { paterno: 'Mendiola', materno: 'Colpari', nombres: 'Keyla' },
      { paterno: 'Meneses', materno: 'Valencia', nombres: 'Nayber' },
      { paterno: 'Mita', materno: 'Garcia', nombres: 'Bayron' },
      { paterno: 'Moreira', materno: 'Chalco', nombres: 'Alexander Maycol' },
      { paterno: 'Navarro', materno: 'Gamboa', nombres: 'Sibelli Estefani' },
      { paterno: 'Nuñez', materno: 'Paredes', nombres: 'Maria Cecilia' },
      { paterno: 'Pinto', materno: 'Monroy', nombres: 'Miguel Angel' },
      { paterno: 'Rodriguez', materno: 'Ajhuacho', nombres: 'Meyli Jhandy' },
      { paterno: 'Rodriguez', materno: 'Alvarado', nombres: 'Ayelen Lene' },
      { paterno: 'Rondal', materno: 'Camacho', nombres: 'Andres' },
      { paterno: 'Villca', materno: 'Rosarios', nombres: 'Guisell Paola' },
      { paterno: 'Zurita', materno: 'Huanca', nombres: 'Carla Valeria' },
    ],
  },
  {
    // 5° A Secundaria: NO se incluye — sus 34 alumnos ya existen en el sistema
    // (curso demo de la exposición) y ninguno aparece en las listas de becas.
    nivel: 'SECUNDARIA', gradoOrden: 5, letra: 'A', alumnos: [],
  },
  {
    nivel: 'SECUNDARIA', gradoOrden: 6, letra: 'A', alumnos: [
      { paterno: 'Aldunate', materno: 'Flores', nombres: 'Adrian Alejandro' },
      { paterno: 'Ayala', materno: 'Soto', nombres: 'Gerson Rafael', becado: true },
      { paterno: 'Bernal', materno: 'Ayaviri', nombres: 'Vania Pamela' },
      { paterno: 'Canaviri', materno: 'Paniagua', nombres: 'Rusland Andry' },
      { paterno: 'Choque', materno: 'Vargas', nombres: 'Jhamil Josue' },
      { paterno: 'Chura', materno: 'Villa', nombres: 'Aneth Patricia' },
      { paterno: 'Claros', materno: 'Mamani', nombres: 'Noelia Alejandra' },
      { paterno: 'Condori', materno: 'Estrada', nombres: 'Leonel Dennis' },
      { paterno: 'Copali', materno: 'Bolivar', nombres: 'Camila' },
      { paterno: 'Fernandez', materno: 'Diaz', nombres: 'Camila' },
      { paterno: 'Flores', materno: 'Agostopa', nombres: 'Valeria Laia' },
      { paterno: 'Flores', materno: 'Mamani', nombres: 'Rodrigo' },
      { paterno: 'Guaman', materno: 'Mamani', nombres: 'Margoth' },
      { paterno: 'Mamani', materno: 'Rodriguez', nombres: 'Jhosep Alan' },
      { paterno: 'Marquez', materno: 'Zola', nombres: 'Abner Daniel' },
      { paterno: 'Mendoza', materno: 'Gomez', nombres: 'Nataly Jhancarla' },
      { paterno: 'Quispe', materno: 'Jarpa', nombres: 'Erick Antony' },
      { paterno: 'Ramos', materno: 'Lucas', nombres: 'Kathia' },
      { paterno: 'Rivera', materno: 'Huanca', nombres: 'Jhoana' },
      { paterno: 'Rocha', materno: 'Camacho', nombres: 'Melani Milenka' },
      { paterno: 'Rojas', materno: 'Laime', nombres: 'Shanel Kira' },
      { paterno: 'Sequeiros', materno: 'Bedoya', nombres: 'Anabel Paola' },
      { paterno: 'Topori', materno: 'Loayza', nombres: 'Brighit Arlem' },
      { paterno: 'Vallejos', materno: 'Roselio', nombres: 'Maya Rocio' },
      { paterno: 'Vasquez', materno: 'Angulo', nombres: 'Aaron' },
      { paterno: 'Velarde', materno: 'Vargas', nombres: 'Paola Lisel' },
      { paterno: 'Vidal', materno: 'Campos', nombres: 'Jhosenth Nelson' },
      { paterno: 'Zambrana', materno: 'Montecinos', nombres: 'Briselle Elizabeth' },
    ],
  },
]

// ─── Familias que ya existen (un hermano ya está en el sistema — 5° Secundaria A) ──
// Se reutiliza el padre ya creado en vez de crear uno nuevo, buscándolo por el
// email del hermano existente.

const FAMILIA_EXISTENTE: Record<string, string> = {
  'AGUILAR|HUANCA':   'aguilar.huanca.jesus.2025@uepioxii.edu.bo',
  'CHAMBILLA|SARCILLO': 'jhesith.chambilla6@uepioxii.edu.bo',
  'COPALI|BOLIVAR':   'copali.bolivar.priscila.2025@uepioxii.edu.bo',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function stripAccents(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ñ/gi, 'n')
}
function familyKey(paterno: string, materno: string): string {
  return `${stripAccents(paterno).toUpperCase().trim()}|${stripAccents(materno).toUpperCase().trim()}`
}
function slug(s: string): string {
  return stripAccents(s).toLowerCase().replace(/[^a-z0-9]/g, '')
}
function toTitle(s: string): string {
  return s.split(' ').filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
}

interface FilaCredencial { rol: string; curso: string; apellidos: string; nombre: string; email: string; password: string }

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const SUPABASE_URL = process.env['SUPABASE_URL']!
  const SERVICE_KEY  = process.env['SUPABASE_SERVICE_ROLE_KEY']!
  const DIRECT_URL   = process.env['DIRECT_URL']!

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
  const prisma   = new PrismaClient({ datasources: { db: { url: DIRECT_URL } } })

  async function createSupabaseUser(email: string, password: string): Promise<string> {
    const { data, error } = await supabase.auth.admin.createUser({ email, password, email_confirm: true })
    if (!error) return data.user.id
    if (error.message.toLowerCase().includes('already')) {
      const { data: list } = await supabase.auth.admin.listUsers({ perPage: 2000 })
      const found = list?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase())
      if (found) return found.id
    }
    throw new Error(`Supabase: ${error.message} (${email})`)
  }

  const inst = await prisma.institucion.findUnique({ where: { subdominio: 'pioxii' } })
  if (!inst) { console.error('No se encontró la institución "pioxii"'); process.exit(1) }

  const gestion = await prisma.gestion.findFirst({ where: { institucion_id: inst.id, activa: true } })
  if (!gestion) { console.error('No hay gestión activa'); process.exit(1) }

  const niveles = await prisma.nivel.findMany({ where: { institucion_id: inst.id } })
  const nivelIdPorNombre = new Map(niveles.map(n => [n.nombre, n.id]))

  console.log(`\n${COMMIT ? 'MODO COMMIT — se va a escribir en la base de datos real' : 'MODO REPORTE (dry-run) — no se escribe nada'}\n`)

  // ── Emails ya usados (para evitar colisiones) ────────────────────────────
  const usuariosExistentes = await prisma.usuario.findMany({ where: { institucion_id: inst.id }, select: { email: true } })
  const emailsUsados = new Set(usuariosExistentes.map(u => u.email.toLowerCase()))

  let estCount = await prisma.estudiante.count({ where: { usuario: { institucion_id: inst.id } } })
  let padreContador = 35 // continúa la numeración de padre.apellido1.apellido2.NN@gmail.com (35 ya usados)

  function nextEstudianteEmail(paterno: string, materno: string, primerNombre: string): string {
    const base = `${slug(paterno)}.${slug(materno)}.${slug(primerNombre)}`
    let email = `${base}@uepioxii.edu.bo`
    let n = 2
    while (emailsUsados.has(email.toLowerCase())) {
      email = `${base}${n}@uepioxii.edu.bo`
      n++
    }
    emailsUsados.add(email.toLowerCase())
    return email
  }
  function nextPadreEmail(paterno: string, materno: string): string {
    padreContador++
    const email = `padre.${slug(paterno)}.${slug(materno)}.${String(padreContador).padStart(2, '0')}@gmail.com`
    emailsUsados.add(email.toLowerCase())
    return email
  }

  // ── Agrupar por familia (apellido paterno + materno) ─────────────────────
  interface AlumnoConCurso extends AlumnoRaw { nivel: string; gradoOrden: number; letra: string }
  const familias = new Map<string, AlumnoConCurso[]>()
  for (const curso of CURSOS) {
    for (const al of curso.alumnos) {
      const key = familyKey(al.paterno, al.materno)
      const arr = familias.get(key) ?? []
      arr.push({ ...al, nivel: curso.nivel, gradoOrden: curso.gradoOrden, letra: curso.letra })
      familias.set(key, arr)
    }
  }

  const credenciales: FilaCredencial[] = []
  let nuevosEstudiantes = 0
  let nuevosPadres = 0
  let familiasNuevas = 0
  let familiasReutilizadas = 0

  const paraleloCache = new Map<string, string>() // `${nivel}-${gradoOrden}-${letra}` -> paralelo_id

  async function getOrCreateParalelo(nivel: string, gradoOrden: number, letra: string): Promise<string> {
    const cacheKey = `${nivel}-${gradoOrden}-${letra}`
    const cached = paraleloCache.get(cacheKey)
    if (cached) return cached

    const nivel_id = nivelIdPorNombre.get(nivel)!
    const grado = await prisma.grado.findFirst({ where: { nivel_id, orden: gradoOrden } })
    if (!grado) throw new Error(`No se encontró el grado orden=${gradoOrden} en nivel ${nivel}`)

    let paralelo = await prisma.paralelo.findFirst({ where: { grado_id: grado.id, letra } })
    if (!paralelo) {
      console.log(`  [paralelo] Falta crear ${nivel} orden ${gradoOrden} "${letra}" — ${COMMIT ? 'creando…' : '(se crearía)'}`)
      if (COMMIT) {
        paralelo = await prisma.paralelo.create({ data: { grado_id: grado.id, letra, activo: true } })
      } else {
        paraleloCache.set(cacheKey, '(pendiente)')
        return '(pendiente)'
      }
    }
    paraleloCache.set(cacheKey, paralelo.id)
    return paralelo.id
  }

  for (const [key, alumnos] of familias) {
    const paternoRef = alumnos[0]!.paterno
    const maternoRef = alumnos[0]!.materno
    const apellidoFamilia = [paternoRef, maternoRef].filter(Boolean).map(toTitle).join(' ') || 'Familia'

    // ── Resolver padre de la familia ────────────────────────────────────────
    let padreId: string | null = null
    let padreEmail = ''
    let esFamiliaNueva = true

    const emailHermanoExistente = FAMILIA_EXISTENTE[key]
    if (emailHermanoExistente) {
      const hermano = await prisma.usuario.findUnique({ where: { email: emailHermanoExistente } })
      if (hermano) {
        const est = await prisma.estudiante.findUnique({ where: { usuario_id: hermano.id }, include: { relaciones_padre: true } })
        if (est && est.relaciones_padre[0]) {
          padreId = est.relaciones_padre[0].padre_id
          const padreUsuario = await prisma.usuario.findUnique({ where: { id: padreId } })
          padreEmail = padreUsuario?.email ?? '(existente)'
          esFamiliaNueva = false
          familiasReutilizadas++
          console.log(`  [familia] ${key} → reutiliza padre existente (${padreEmail}) via hermano ${emailHermanoExistente}`)
        }
      }
    }

    if (!padreId) {
      familiasNuevas++
      padreEmail = nextPadreEmail(paternoRef, maternoRef)
      if (COMMIT) {
        const authId = await createSupabaseUser(padreEmail, PWD_PADRE)
        const padre = await prisma.usuario.create({
          data: {
            supabase_auth_id: authId, email: padreEmail,
            nombre: 'Padre/Madre', apellido: `de ${apellidoFamilia}`,
            rol: 'PADRE_TUTOR', institucion_id: inst.id,
          },
        })
        padreId = padre.id
      } else {
        padreId = '(pendiente)'
      }
      nuevosPadres++
      credenciales.push({ rol: 'PADRE', curso: '', apellidos: `de ${apellidoFamilia}`, nombre: 'Padre/Madre', email: padreEmail, password: PWD_PADRE })
    }

    // ── Crear cada estudiante de la familia ──────────────────────────────────
    for (const al of alumnos) {
      const apellido = [al.paterno, al.materno].filter(Boolean).map(toTitle).join(' ')
      const nombre   = toTitle(al.nombres)
      const primerNombre = al.nombres.split(' ')[0]!
      const email = nextEstudianteEmail(al.paterno || 'sn', al.materno, primerNombre)
      const cursoLabel = `${al.nivel} orden ${al.gradoOrden} "${al.letra}"`

      const anomalia = !al.paterno || !al.materno ? ' ⚠ APELLIDO INCOMPLETO EN EL PDF ORIGINAL' : ''
      console.log(`  [estudiante] ${apellido}, ${nombre} — ${cursoLabel}${al.becado ? ' [BECADO]' : ''}${al.mediaBeca ? ' [MEDIA BECA]' : ''}${anomalia}`)

      nuevosEstudiantes++
      credenciales.push({ rol: 'ESTUDIANTE', curso: cursoLabel, apellidos: apellido, nombre, email, password: PWD_ESTUDIANTE })

      const paralelo_id = await getOrCreateParalelo(al.nivel, al.gradoOrden, al.letra)
      if (!COMMIT) continue

      const grado = await prisma.paralelo.findUnique({ where: { id: paralelo_id }, include: { grado: true } })
      const nivel_id = grado!.grado.nivel_id

      const authId = await createSupabaseUser(email, PWD_ESTUDIANTE)
      estCount++
      const codigo = `EST-${gestion.anno}-${String(estCount).padStart(3, '0')}`

      const estudiante = await prisma.estudiante.create({
        data: {
          codigo,
          becado: !!al.becado,
          media_beca: !!al.mediaBeca,
          ...(al.becado || al.mediaBeca ? { motivo_beca: 'Según lista de becas 2026' } : {}),
          nivel: { connect: { id: nivel_id } },
          usuario: { create: { supabase_auth_id: authId, email, nombre, apellido, rol: 'ESTUDIANTE', institucion_id: inst.id } },
          matriculas: { create: { paralelo_id, gestion_id: gestion.id } },
        },
      })

      await prisma.relacionPadreHijo.upsert({
        where:  { padre_id_estudiante_id: { padre_id: padreId!, estudiante_id: estudiante.id } },
        create: { padre_id: padreId!, estudiante_id: estudiante.id },
        update: {},
      })
    }
  }

  console.log(`\n${'─'.repeat(90)}`)
  console.log(`  Estudiantes nuevos: ${nuevosEstudiantes}`)
  console.log(`  Padres nuevos: ${nuevosPadres} (familias reutilizadas de un hermano ya existente: ${familiasReutilizadas})`)
  console.log(`  Familias nuevas: ${familiasNuevas}`)
  console.log('─'.repeat(90))

  if (COMMIT) {
    const csvLines = ['rol,curso,apellidos,nombre,email,password']
    for (const c of credenciales) {
      csvLines.push([c.rol, c.curso, c.apellidos, c.nombre, c.email, c.password].map(v => `"${v.replace(/"/g, '""')}"`).join(','))
    }
    const csvPath = 'credenciales-2026.csv'
    writeFileSync(csvPath, csvLines.join('\n'), 'utf-8')
    console.log(`\n  Credenciales exportadas a ${csvPath} (${credenciales.length} filas) — no se sube a git.\n`)
  } else {
    console.log('\n  Nada se escribió — corré con --commit para aplicar de verdad.\n')
  }

  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
