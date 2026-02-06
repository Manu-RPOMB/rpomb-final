// supabase/functions/gemini/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // 1. Gérer les requêtes préliminaires (CORS Preflight)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 2. Récupérer la clé API depuis les secrets Supabase
    // C'est ici qu'il va chercher la clé que tu as ajoutée dans le Dashboard !
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error(
        'La clé API GEMINI_API_KEY est manquante dans les Secrets Supabase.'
      );
    }

    // 3. Lire le corps de la requête envoyé par ton App React
    const { prompt, imageBase64 } = await req.json();

    // 4. Construire le message pour Google Gemini
    // On utilise le modèle "gemini-1.5-flash" (rapide et efficace)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    let contents = [];

    if (imageBase64) {
      // Cas OCR : Texte + Image
      contents = [
        {
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: 'image/jpeg', // On assume du jpeg/png, Gemini gère bien
                data: imageBase64,
              },
            },
          ],
        },
      ];
    } else {
      // Cas SOS Recette : Texte seul
      contents = [
        {
          parts: [{ text: prompt }],
        },
      ];
    }

    // 5. Appel direct à l'API Google (REST)
    // On évite les librairies complexes pour garantir la stabilité
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ contents }),
    });

    const data = await response.json();

    // 6. Gestion des erreurs renvoyées par Google
    if (!response.ok) {
      console.error('Erreur Google:', data);
      throw new Error(data.error?.message || "Erreur inconnue de l'API Google");
    }

    // 7. Extraction de la réponse texte propre
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText) {
      throw new Error("L'IA n'a renvoyé aucun texte.");
    }

    // 8. Succès ! On renvoie le texte au React
    return new Response(JSON.stringify({ text: generatedText }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Erreur Backend:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, // Erreur serveur
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
