import { GoogleGenerativeAI } from "@google/generative-ai";

interface OutputFormat {
  [key: string]: string | string[] | OutputFormat;
}

/**
 * strict_output
 * Genera preguntas/respuestas usando la API de PaLM/Gemini y las valida en JSON.
 * 
 * @param system_prompt - Prompt inicial (contexto / reglas).
 * @param user_prompt - Contenido que quieres generar (puede ser string o array de strings).
 * @param output_format - Estructura que debe tener el JSON de salida (claves requeridas).
 * @param default_category - Valor por defecto en caso de no coincidir con un set de categorías.
 * @param output_value_only - Si true, devuelve solo los valores, sin las claves.
 * @param modelName - Nombre del modelo (por defecto "gemini-1.5-flash").
 * @param temperature - Control de aleatoriedad.
 * @param num_tries - Reintentos en caso de parsear mal la respuesta.
 * @param verbose - Log de depuración.
 * @returns Array de objetos con la estructura { question, answer }, o vacío si falla.
 */
export async function strict_output(
  system_prompt: string,
  user_prompt: string | string[],
  output_format: OutputFormat,
  default_category: string = "",
  output_value_only: boolean = false,
  modelName: string = "gemini-1.5-flash",
  temperature: number = 1,
  num_tries: number = 3,
  verbose: boolean = false
): Promise<
  {
    question: string;
    answer: string;
  }[]
> {
  // 1) Instancia el cliente generativo de Google
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
  const model = genAI.getGenerativeModel({ model: modelName });

  // 2) Check si user_prompt es array
  const list_input = Array.isArray(user_prompt);
  const dynamic_elements = /<.*?>/.test(JSON.stringify(output_format));
  const list_output = /\[.*?\]/.test(JSON.stringify(output_format));
  let error_msg = "";

  // Reintentamos hasta num_tries
  for (let i = 0; i < num_tries; i++) {
    // Construimos el sub-prompt para el formato
    let output_format_prompt = `\nDebes generar lo siguiente en formato JSON: ${JSON.stringify(
      output_format
    )}. \nNo ponga comillas ni caracteres de escape \\ en los campos de salida.`;

    if (list_output) {
      output_format_prompt += `\nSi el campo de salida es una lista, clasifique la salida en el mejor elemento de la lista.`;
    }

    if (dynamic_elements) {
      output_format_prompt += `\nCualquier texto entre < and > indica que debe generar contenido para reemplazarlo...`;
    }

    if (list_input) {
      output_format_prompt += `\nGenerar una lista de JSON, un JSON para cada elemento de entrada.`;
    }

    // Prompt final que se envía al modelo
    const finalPrompt =
      system_prompt + output_format_prompt + error_msg + "\n" + user_prompt.toString();

    let resText = "";
    try {
      // 3) Llamada al modelo
      const result = await model.generateContent(finalPrompt, {
        temperature,
        // Ajusta aquí topP, topK si hace falta
      });

      // 4) Texto que devuelve la IA
      resText = result?.response?.text() ?? "";
    } catch (error) {
      console.error("Error al llamar a la API de Gemini:", error);
      continue; // Reintenta en la siguiente vuelta
    }

    // ---- (A) Eliminar las fences de Markdown ----
    let res = resText
      .replace(/```json/g, "")  // elimina ```json
      .replace(/```/g, "")      // elimina ```
      .trim();

    // ---- (B) Reemplazos de comillas que ya tenías ----
    res = res.replace(/'/g, '"');
    res = res.replace(/(\w)"(\w)/g, "$1'$2");

    if (verbose) {
      console.log("System prompt:", finalPrompt);
      console.log("\nGemini response AFTER REMOVING BACKTICKS:\n", res);
    }

    // ---- (C) Intentamos parsear como JSON ----
    try {
      let output: any = JSON.parse(res);

      // Si user_prompt era array, esperamos array de objetos JSON
      if (list_input) {
        if (!Array.isArray(output)) {
          throw new Error("Output format not in a list of JSON");
        }
      } else {
        // Si no, lo envolvemos en un array
        output = [output];
      }

      // (D) Validar adherencia al formato
      for (let index = 0; index < output.length; index++) {
        for (const key in output_format) {
          // Si la key contiene <...>, dejamos que sea dinámico
          if (/<.*?>/.test(key)) continue;

          // Si falta la key
          if (!(key in output[index])) {
            throw new Error(`${key} not in JSON output`);
          }

          // Si output_format[key] es un array de strings => set de opciones
          if (Array.isArray(output_format[key])) {
            const choices = output_format[key] as string[];
            // Si la IA devolvió array en esa clave, tomamos el primer elemento
            if (Array.isArray(output[index][key])) {
              output[index][key] = output[index][key][0];
            }
            // Si no coincide con las choices y hay default_category, lo asignamos
            if (!choices.includes(output[index][key]) && default_category) {
              output[index][key] = default_category;
            }
            // Si la IA devolvió algo con ":", partimos y tomamos lo anterior
            if (
              typeof output[index][key] === "string" &&
              output[index][key].includes(":")
            ) {
              output[index][key] = output[index][key].split(":")[0];
            }
          }
        }

        // (E) Si solo queremos los valores, no las keys
        if (output_value_only) {
          output[index] = Object.values(output[index]);
          // Si solo hay una clave en total, devolvemos el valor en vez de un array
          if (output[index].length === 1) {
            output[index] = output[index][0];
          }
        }
      }

      // (F) Éxito: devolvemos la salida
      return list_input ? output : output[0];
    } catch (e) {
      // (G) Falló el parseo o la validación
      error_msg = `\n\nResult: ${resText}\n\nError message: ${e}`;
      console.log("Error parseando JSON:", e);
      console.log("Texto recibido:", resText);
    }
  }

  // Si tras num_tries no lo logramos, retornamos array vacío
  return [];
}
