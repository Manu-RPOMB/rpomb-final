import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Truck, Plus, Trash2, ChefHat, Edit3, LogOut, ShoppingBag, CheckSquare, Send, Clock, Upload, AlertTriangle, X, Search, List, FileText, ChevronLeft, Settings, Calculator, Sparkles, UserCheck, ShieldCheck, ShieldAlert } from 'lucide-react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { GoogleGenerativeAI } from "@google/generative-ai";

// --- CORRECTIF BUFFER ---
if (typeof global === 'undefined') { window.global = window; }

// --------------------------------------------------------
// 👇 TES CLÉS SUPABASE 👇
// --------------------------------------------------------
const SUPABASE_URL = 'https://ofbehieunbdhmhjgdgcc.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9mYmVoaWV1bmJkaG1oamdkZ2NjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MjU2MDgsImV4cCI6MjA4NDUwMTYwOH0._qz6-Nc8df_-be9ik-aLAOhJHijxwxBWm_pZSQKypuM';
// --------------------------------------------------------
// 👇 TA CLÉ GEMINI (GOOGLE AI) 👇
const GEMINI_API_KEY = "AIzaSyCXY1yNb0j2U30a68YvXIq9pWhJkvcERyI"; 
// --------------------------------------------------------

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// NOUVELLES FAMILLES DEMANDÉES
const FAMILLES_INGREDIENTS = ['Tout', 'Frais', 'Surgelé', 'Epicerie', 'Légumes', 'Viande', 'Emballage', 'Entretien', 'Divers'];
// FAMILLES RECETTES (A AJUSTER SELON TA PJ SI BESOIN)
const FAMILLES_RECETTES = ['Sandwich', 'Snack', 'Salade', 'Repas', 'Soupe', 'Dessert', 'Boisson', 'Autre'];

const MARGES_FINANCIERES = {
    'Sandwich': 0.50, 'Snack': 0.80, 'Salade': 0.80, 'Repas': 0.80, 
    'Soupe': 0.20, 'Dessert': 0.20, 'Boisson': 0.50, 'Autre': 0.00
};

export default function App() {
  const [user, setUser] = useState(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');

  const [activeTab, setActiveTab] = useState('commandes');
  const [ingredients, setIngredients] = useState([]);
  const [fournisseurs, setFournisseurs] = useState([]); // Nouvelle liste fournisseurs
  const [recettes, setRecettes] = useState([]);
  const [historiqueCommandes, setHistoriqueCommandes] = useState([]);
  const [commandeDetail, setCommandeDetail] = useState(null);
  
  // NOUVEAU : ETATS DE VALIDATION
  const [pendingItems, setPendingItems] = useState({ ingredients: [], fournisseurs: [] });
  const [showCreateFournisseur, setShowCreateFournisseur] = useState(false);
  const [showCreateIngredient, setShowCreateIngredient] = useState(false);
  const [newFournData, setNewFournData] = useState({ nom: '', adresse: '', tel: '', email: '', contact: '', tva: '' });
  const [newIngData, setNewIngData] = useState({ nom: '', famille: 'Frais', fournisseur: '', ref_frn: '', prix: '', unite: 'kg' });

  // IA GEMINI
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState('');
  const [showAiModal, setShowAiModal] = useState(false);

  // ETATS EXISTANTS
  const [recetteDetails, setRecetteDetails] = useState([]);
  const [selectedRecette, setSelectedRecette] = useState(null);
  const [isCreatingRecette, setIsCreatingRecette] = useState(false);
  const [newRecetteName, setNewRecetteName] = useState('');
  const [newRecetteCat, setNewRecetteCat] = useState('Repas');
  const [editingIngredient, setEditingIngredient] = useState(null);
  const [inventoryData, setInventoryData] = useState([]); 
  const [manualBarcode, setManualBarcode] = useState('');
  const [viewCmd, setViewCmd] = useState('menu');
  const [filtreFamille, setFiltreFamille] = useState('Tout');

  useEffect(() => { 
    if (user) { 
        fetchData(); 
    }
  }, [user]);

  async function fetchData() {
      // Récupère ingrédients validés
      const { data: ing } = await supabase.from('ingredients').select('*').eq('is_validated', true).order('nom');
      if (ing) setIngredients(ing);
      
      // Récupère ingrédients en attente
      const { data: pendingIng } = await supabase.from('ingredients').select('*').eq('is_validated', false);
      
      // Simule une table fournisseurs (si elle n'existe pas encore, on utilise les champs texte existants, mais ici on prépare le terrain)
      // Pour l'instant on filtre les fournisseurs uniques des ingrédients
      const uniqueFourn = [...new Set(ing?.map(i => i.fournisseur) || [])];
      setFournisseurs(uniqueFourn);

      const { data: rec } = await supabase.from('recettes').select('*').order('nom_recette');
      if (rec) setRecettes(rec);

      const { data: cmd } = await supabase.from('commandes').select('*').order('created_at', { ascending: false }); 
      if (cmd) setHistoriqueCommandes(cmd);

      // Stocke les éléments en attente pour l'admin
      setPendingItems({
          ingredients: pendingIng || [],
          fournisseurs: [] // A connecter à une vraie table fournisseurs plus tard
      });
  }

  const handleLogin = async (e) => { e.preventDefault(); const { data, error } = await supabase.from('app_users').select('*').eq('email', loginEmail).eq('password', loginPass).single(); if (error || !data) setLoginError("Email ou mot de passe incorrect."); else setUser(data); };
  const handleLogout = () => { setUser(null); };

  // --- LOGIQUE VALIDATION (ADMIN) ---
  const validerIngredient = async (id, valide) => {
      if (valide) {
          await supabase.from('ingredients').update({ is_validated: true }).eq('id', id);
          alert("✅ Ingrédient validé et ajouté au stock !");
      } else {
          if(confirm("Rejeter et supprimer cette demande ?")) {
              await supabase.from('ingredients').delete().eq('id', id);
          }
      }
      fetchData();
  };

  const demanderCreationFournisseur = () => {
      // Simulation d'envoi (Faute de table dédiée dans ce code simplifié)
      alert(`📤 Demande envoyée à l'administrateur pour : ${newFournData.nom}\n(L'admin devra créer la fiche officiellement)`);
      setShowCreateFournisseur(false);
      setNewFournData({ nom: '', adresse: '', tel: '', email: '', contact: '', tva: '' });
  };

  const demanderCreationIngredient = async () => {
      if (!newIngData.nom || !newIngData.prix) return alert("Nom et Prix obligatoires");
      
      // On insère avec is_validated = false
      const { error } = await supabase.from('ingredients').insert({
          nom: newIngData.nom,
          famille: newIngData.famille,
          fournisseur: newIngData.fournisseur === 'Autre' ? 'A Définir' : newIngData.fournisseur,
          reference_fournisseur: newIngData.ref_frn,
          prix_achat_moyen: parseFloat(newIngData.prix),
          unite: newIngData.unite,
          stock_actuel: 0,
          is_validated: false // <--- LA CLE DU SYSTEME
      });

      if (!error) {
          alert("⏳ Demande envoyée ! L'article sera disponible après validation de l'admin.");
          setShowCreateIngredient(false);
          setNewIngData({ nom: '', famille: 'Frais', fournisseur: '', ref_frn: '', prix: '', unite: 'kg' });
          fetchData(); // Rafraichir pour voir si on est admin
      } else {
          alert("Erreur: " + error.message);
      }
  };

  // --- LOGIQUE IA (GEMINI) ---
  const askGeminiIdeas = async () => {
      setAiLoading(true);
      setShowAiModal(true);
      
      // 1. On prépare la liste des restes (ce qui est en stock positif)
      const restes = ingredients.filter(i => i.stock_actuel > 0).map(i => `${i.stock_actuel} ${i.unite} de ${i.nom}`).join(', ');
      
      const prompt = `Je suis un chef de collectivité. Voici mon stock actuel : ${restes}. 
      Propose-moi 3 idées de recettes créatives et anti-gaspi pour utiliser ces restes. 
      Fais court, précis, et indique pour chaque idée les ingrédients principaux utilisés.`;

      try {
          const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
          const result = await model.generateContent(prompt);
          const response = await result.response;
          setAiResponse(response.text());
      } catch (error) {
          setAiResponse("⚠️ Erreur IA : Vérifie ta clé API ou ta connexion.\n" + error.message);
      } finally {
          setAiLoading(false);
      }
  };

  // --- UI COMPONENTS ---

  if (!user) return <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans"><div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-sm text-center"><h1 className="text-3xl font-black text-slate-800 mb-6">RPOMB<span className="text-blue-600">.app</span></h1><form onSubmit={handleLogin} className="space-y-4"><input type="email" placeholder="Email" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" value={loginEmail} onChange={e=>setLoginEmail(e.target.value)}/><input type="password" placeholder="Mot de passe" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" value={loginPass} onChange={e=>setLoginPass(e.target.value)}/><button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-bold transition-all shadow-lg shadow-blue-200">CONNEXION</button></form></div></div>;

  return (
    <div className="max-w-md mx-auto bg-slate-50 min-h-screen pb-24 font-sans text-slate-800">
      
      {/* HEADER */}
      <div className="bg-white p-4 shadow-sm sticky top-0 z-20 flex justify-between items-center border-b border-slate-100">
          <div className="flex items-center gap-2"><div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black">R</div><h1 className="font-bold text-lg text-slate-700">RPOMB <span className="text-xs font-normal bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">v27 AI</span></h1></div>
          <div className="flex items-center gap-3"><span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-full">{user.role === 'admin' ? 'ADMIN' : 'COOK'}</span><button onClick={handleLogout} className="text-slate-400 hover:text-red-500"><LogOut size={20}/></button></div>
      </div>

      <div className="p-4">
        
        {/* MODAL IA */}
        {showAiModal && (
            <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm max-h-[80vh] overflow-y-auto p-6 animate-in fade-in zoom-in border-t-8 border-purple-600">
                    <div className="flex justify-between items-center mb-4"><h3 className="text-lg font-black text-purple-600 flex items-center gap-2"><Sparkles/> Chef Gemini</h3><button onClick={()=>setShowAiModal(false)}><X/></button></div>
                    {aiLoading ? (
                        <div className="text-center py-10 space-y-4"><div className="animate-spin text-4xl">🔮</div><p className="text-slate-500 font-bold animate-pulse">Analyse du stock en cours...</p></div>
                    ) : (
                        <div className="prose prose-sm prose-purple overflow-y-auto whitespace-pre-wrap font-medium text-slate-600">{aiResponse}</div>
                    )}
                </div>
            </div>
        )}

        {/* MODAL CREATION FOURNISSEUR */}
        {showCreateFournisseur && (
            <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-in fade-in zoom-in">
                    <h3 className="text-lg font-black text-slate-800 mb-4">Nouveau Fournisseur</h3>
                    <div className="space-y-3">
                        <input className="w-full border p-3 rounded-xl" placeholder="Nom Société *" value={newFournData.nom} onChange={e=>setNewFournData({...newFournData, nom: e.target.value})}/>
                        <input className="w-full border p-3 rounded-xl" placeholder="Adresse complète" value={newFournData.adresse} onChange={e=>setNewFournData({...newFournData, adresse: e.target.value})}/>
                        <div className="flex gap-2">
                             <input className="w-full border p-3 rounded-xl" placeholder="Téléphone" value={newFournData.tel} onChange={e=>setNewFournData({...newFournData, tel: e.target.value})}/>
                             <input className="w-full border p-3 rounded-xl" placeholder="TVA" value={newFournData.tva} onChange={e=>setNewFournData({...newFournData, tva: e.target.value})}/>
                        </div>
                        <input className="w-full border p-3 rounded-xl" placeholder="Email Commande" value={newFournData.email} onChange={e=>setNewFournData({...newFournData, email: e.target.value})}/>
                        <input className="w-full border p-3 rounded-xl" placeholder="Nom Commercial Référent" value={newFournData.contact} onChange={e=>setNewFournData({...newFournData, contact: e.target.value})}/>
                        <div className="bg-blue-50 p-3 rounded-xl text-xs text-blue-700 mb-2">ℹ️ Cette fiche devra être validée par l'admin avant utilisation.</div>
                        <div className="flex gap-2"><button onClick={()=>setShowCreateFournisseur(false)} className="flex-1 py-3 text-slate-400 font-bold">Annuler</button><button onClick={demanderCreationFournisseur} className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold">Soumettre</button></div>
                    </div>
                </div>
            </div>
        )}

        {/* MODAL CREATION INGREDIENT */}
        {showCreateIngredient && (
            <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-in fade-in zoom-in">
                    <h3 className="text-lg font-black text-slate-800 mb-4">Nouvel Article</h3>
                    <div className="space-y-3">
                        <input className="w-full border p-3 rounded-xl font-bold" placeholder="Nom du produit *" value={newIngData.nom} onChange={e=>setNewIngData({...newIngData, nom: e.target.value})}/>
                        <div className="flex gap-2">
                             <select className="w-1/2 border p-3 rounded-xl" value={newIngData.famille} onChange={e=>setNewIngData({...newIngData, famille: e.target.value})}>{FAMILLES_INGREDIENTS.map(f=><option key={f} value={f}>{f}</option>)}</select>
                             <select className="w-1/2 border p-3 rounded-xl" value={newIngData.unite} onChange={e=>setNewIngData({...newIngData, unite: e.target.value})}><option value="kg">kg</option><option value="L">L</option><option value="pce">pce</option></select>
                        </div>
                        <select className="w-full border p-3 rounded-xl" value={newIngData.fournisseur} onChange={e=>setNewIngData({...newIngData, fournisseur: e.target.value})}>
                            <option value="">-- Choisir Fournisseur --</option>
                            {fournisseurs.map(f=><option key={f} value={f}>{f}</option>)}
                            <option value="Autre">Autre (Nouveau)</option>
                        </select>
                        <div className="flex gap-2">
                             <input className="w-1/2 border p-3 rounded-xl" placeholder="Réf. Frn" value={newIngData.ref_frn} onChange={e=>setNewIngData({...newIngData, ref_frn: e.target.value})}/>
                             <input className="w-1/2 border p-3 rounded-xl text-green-600 font-bold" type="number" placeholder="Prix € HT" value={newIngData.prix} onChange={e=>setNewIngData({...newIngData, prix: e.target.value})}/>
                        </div>
                        <div className="bg-amber-50 p-3 rounded-xl text-xs text-amber-800 mb-2">⚠️ Prix à vérifier à la réception. Validation Admin requise.</div>
                        <div className="flex gap-2"><button onClick={()=>setShowCreateIngredient(false)} className="flex-1 py-3 text-slate-400 font-bold">Annuler</button><button onClick={demanderCreationIngredient} className="flex-1 bg-green-600 text-white py-3 rounded-xl font-bold">Soumettre</button></div>
                    </div>
                </div>
            </div>
        )}

        {/* SECTION ADMIN - VALIDATION */}
        {user.role === 'admin' && pendingItems.ingredients.length > 0 && (
            <div className="mb-6 animate-in slide-in-from-top">
                <div className="bg-amber-100 border-l-4 border-amber-500 p-4 rounded-r-xl shadow-sm">
                    <h3 className="font-bold text-amber-900 flex items-center gap-2"><ShieldAlert/> Validations en attente ({pendingItems.ingredients.length})</h3>
                    <div className="mt-3 space-y-2">
                        {pendingItems.ingredients.map(ing => (
                            <div key={ing.id} className="bg-white p-3 rounded-lg flex justify-between items-center text-sm shadow-sm">
                                <div>
                                    <div className="font-bold">{ing.nom}</div>
                                    <div className="text-xs text-slate-500">{ing.fournisseur} - {ing.prix_achat_moyen}€/{ing.unite}</div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={()=>validerIngredient(ing.id, false)} className="p-2 bg-red-50 text-red-600 rounded hover:bg-red-200"><X size={16}/></button>
                                    <button onClick={()=>validerIngredient(ing.id, true)} className="p-2 bg-green-50 text-green-600 rounded hover:bg-green-200"><CheckSquare size={16}/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {/* INVENTAIRE AVEC IA */}
        {activeTab === 'inventaire' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2"><List className="text-purple-600"/> Inventaire</h2>
                    <button onClick={askGeminiIdeas} className="bg-purple-600 text-white px-4 py-2 rounded-xl font-bold shadow-lg shadow-purple-200 hover:bg-purple-700 transition-all flex items-center gap-2 animate-pulse"><Sparkles size={16}/> SOS Idées ?</button>
                </div>
                {/* ... (Reste du code inventaire standard, masqué pour brièveté, utilise ta version précédente ici) ... */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 text-center text-slate-400 italic">
                    (Liste des ingrédients ici...)
                    <div className="mt-4 flex gap-2 justify-center">
                        {inventoryData.length === 0 && <button onClick={()=>setInventoryData(ingredients.map(i=>({...i, stock_physique: i.stock_actuel})))} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold">Lancer Inventaire</button>}
                    </div>
                </div>
            </div>
        )}

        {/* COMMANDES AVEC CREATION FOURNISSEUR/ARTICLE */}
        {activeTab === 'commandes' && viewCmd === 'creer' && (
             <div className="animate-in slide-in-from-right duration-200 pb-20">
                <div className="flex items-center justify-between mb-4">
                    <button onClick={() => setViewCmd('menu')} className="bg-white border border-slate-200 p-2 rounded-xl text-slate-500 hover:bg-slate-50"><ChevronLeft/></button>
                    <div className="flex gap-2">
                        <button onClick={()=>setShowCreateFournisseur(true)} className="bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50">+ Frn</button>
                        <button onClick={()=>setShowCreateIngredient(true)} className="bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50">+ Article</button>
                    </div>
                </div>
                {/* ... (Liste de commande standard) ... */}
                <div className="p-10 text-center text-slate-400 bg-white rounded-2xl border border-slate-100">
                    Utilisez les boutons en haut pour proposer un nouveau fournisseur ou article.
                </div>
             </div>
        )}
        
        {/* RESTE DE L'APP (DASHBOARD...) */}
        {activeTab === 'commandes' && viewCmd === 'menu' && (
            <div className="space-y-6">
                 <h2 className="text-2xl font-black mb-6 text-slate-800 flex items-center gap-2"><ShoppingBag className="text-blue-600"/> Commandes</h2>
                 <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => setViewCmd('creer')} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center gap-3 hover:border-blue-500 hover:shadow-md transition-all group h-40">
                        <div className="bg-blue-50 p-4 rounded-full group-hover:bg-blue-600 transition-colors"><ShoppingBag size={32} className="text-blue-600 group-hover:text-white transition-colors"/></div>
                        <span className="font-bold text-slate-700">Nouvelle Cmd</span>
                    </button>
                    {/* ... Autres boutons ... */}
                 </div>
            </div>
        )}

      </div>
      
      {/* NAVIGATION BAR */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 flex justify-around p-2 pb-6 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-30">
        <button onClick={()=>{setActiveTab('commandes');setViewCmd('menu')}} className={`p-3 rounded-2xl transition-all flex flex-col items-center gap-1 ${activeTab==='commandes'?'text-blue-600 bg-blue-50 scale-110 shadow-sm':'text-slate-300 hover:text-slate-500'}`}><ShoppingBag size={24}/><span className="text-[10px] font-bold">CMD</span></button>
        <button onClick={()=>setActiveTab('recettes')} className={`p-3 rounded-2xl transition-all flex flex-col items-center gap-1 ${activeTab==='recettes'?'text-orange-500 bg-orange-50 scale-110 shadow-sm':'text-slate-300 hover:text-slate-500'}`}><ChefHat size={24}/><span className="text-[10px] font-bold">COOK</span></button>
        <button onClick={()=>{setActiveTab('inventaire')}} className={`p-3 rounded-2xl transition-all flex flex-col items-center gap-1 ${activeTab==='inventaire'?'text-purple-600 bg-purple-50 scale-110 shadow-sm':'text-slate-300 hover:text-slate-500'}`}><List size={24}/><span className="text-[10px] font-bold">INV.</span></button>
      </div>
    </div>
  );
}