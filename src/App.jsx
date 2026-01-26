import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { TrendingUp, FileSpreadsheet, Truck, Plus, Trash2, ChefHat, Edit3, LogOut, ShoppingBag, CheckSquare, Send, Clock, Upload, AlertTriangle, X, Search, List, FileText, ChevronLeft, Package, Grid, AlertCircle, Calendar, Settings, Euro, Calculator, Banknote, RefreshCw, ArrowRightLeft } from 'lucide-react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

// --- CORRECTIF BUFFER ---
if (typeof global === 'undefined') { window.global = window; }

// --------------------------------------------------------
// 👇 COLLE TES CLÉS SUPABASE ICI 👇
// --------------------------------------------------------
const SUPABASE_URL = 'https://ofbehieunbdhmhjgdgcc.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9mYmVoaWV1bmJkaG1oamdkZ2NjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MjU2MDgsImV4cCI6MjA4NDUwMTYwOH0._qz6-Nc8df_-be9ik-aLAOhJHijxwxBWm_pZSQKypuM';
// --------------------------------------------------------

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const ALLERGENES_LIST = ['Gluten', 'Crustacés', 'Œufs', 'Poissons', 'Arachides', 'Soja', 'Lait', 'Fruits à coque', 'Céleri', 'Moutarde', 'Sésame', 'Sulfites', 'Lupin', 'Mollusques'];
const FAMILLES_LIST = ['Tout', 'Frais', 'Surgelé', 'Epicerie', 'Légumes', 'Viande', 'Non-Alim', 'Divers'];
const MOTIFS_PERTE = ['Périmé', 'Cassé / Tombé', 'Erreur Production', 'Qualité Insuffisante', 'Autre'];

// MARGES IMPOSÉES PAR LA DIRECTION
const MARGES_FINANCIERES = {
    'Sandwich': 0.50,
    'Snack': 0.80,
    'Salade': 0.80,
    'Repas': 0.80, 
    'Soupe': 0.20,
    'Dessert': 0.20,
    'Boisson': 0.50,
    'Autre': 0.00
};

export default function App() {
  const [user, setUser] = useState(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');

  const [activeTab, setActiveTab] = useState('commandes');
  const [ingredients, setIngredients] = useState([]);
  const [recettes, setRecettes] = useState([]);
  const [historiqueCommandes, setHistoriqueCommandes] = useState([]);
  const [commandeDetail, setCommandeDetail] = useState(null);
  const [isProcessingExcel, setIsProcessingExcel] = useState(false);

  // Etats Recettes
  const [selectedRecette, setSelectedRecette] = useState(null);
  const [recetteDetails, setRecetteDetails] = useState([]);
  const [isCreatingRecette, setIsCreatingRecette] = useState(false);
  const [newRecetteName, setNewRecetteName] = useState('');
  const [newRecetteCat, setNewRecetteCat] = useState('Repas');
  const [ajoutIngredientRecette, setAjoutIngredientRecette] = useState(null); 
  const [qteAjoutRecette, setQteAjoutRecette] = useState('');

  // Etats divers
  const [editingIngredient, setEditingIngredient] = useState(null);
  const [modeReception, setModeReception] = useState('choix');
  const [commandesEnAttente, setCommandesEnAttente] = useState([]);
  const [receptionEnCours, setReceptionEnCours] = useState(null);
  const [panierLivraison, setPanierLivraison] = useState([]);
  const [selectedIng, setSelectedIng] = useState('');
  const [qteLivraison, setQteLivraison] = useState('');
  const [prixLivraison, setPrixLivraison] = useState('');
  
  // Navigation Commandes & Finance
  const [viewCmd, setViewCmd] = useState('menu'); 
  const [filtreFournisseur, setFiltreFournisseur] = useState('Tous');
  const [filtreFamille, setFiltreFamille] = useState('Tout'); 

  // INVENTAIRE
  const [inventoryData, setInventoryData] = useState([]); 
  const [manualBarcode, setManualBarcode] = useState('');

  // PERTES & TRANSFORMATION (V26)
  const [showPerteModal, setShowPerteModal] = useState(false);
  const [showTransfoModal, setShowTransfoModal] = useState(false);
  const [perteData, setPerteData] = useState({ id: '', qte: '', motif: 'Périmé', comment: '' });
  const [transfoData, setTransfoData] = useState({ srcId: '', srcQte: '', destId: '', destQte: '' });

  useEffect(() => { 
    if (user) { fetchStock(); fetchRecettes(); fetchHistorique(); }
  }, [user]);

  async function fetchStock() { const { data } = await supabase.from('ingredients').select('*').order('nom'); if (data) setIngredients(data); }
  async function fetchRecettes() { const { data } = await supabase.from('recettes').select('*').order('nom_recette'); if (data) setRecettes(data); }
  async function fetchHistorique() { 
      const { data } = await supabase.from('commandes').select('*').order('created_at', { ascending: false }); 
      if (data) {
          setHistoriqueCommandes(data);
          setCommandesEnAttente(data.filter(c => c.status === 'validated'));
      }
  }

  const handleLogin = async (e) => { e.preventDefault(); const { data, error } = await supabase.from('app_users').select('*').eq('email', loginEmail).eq('password', loginPass).single(); if (error || !data) setLoginError("Email ou mot de passe incorrect."); else setUser(data); };
  const handleLogout = () => { setUser(null); setLoginEmail(''); setLoginPass(''); };

  // --- LOGIQUE PERTES & TRANSFO (V26) ---
  const validerPerte = async () => {
      if (!perteData.id || !perteData.qte) return;
      const ing = ingredients.find(i => i.id === parseInt(perteData.id));
      if (!ing) return;

      const valeurPerdue = ing.prix_achat_moyen * parseFloat(perteData.qte);

      // 1. Mettre à jour le stock (Baisse)
      await supabase.from('ingredients').update({ stock_actuel: (ing.stock_actuel || 0) - parseFloat(perteData.qte) }).eq('id', ing.id);
      
      // 2. Enregistrer dans le journal (Pour le comptable)
      await supabase.from('mouvements_stock').insert({
          ingredient_id: ing.id,
          type_mouvement: 'Perte',
          quantite: parseFloat(perteData.qte),
          motif: `${perteData.motif} ${perteData.comment ? `(${perteData.comment})` : ''}`,
          valeur_perte: valeurPerdue
      });

      alert(`🗑️ Perte enregistrée !\nValeur perdue : ${valeurPerdue.toFixed(2)} €`);
      setShowPerteModal(false);
      setPerteData({ id: '', qte: '', motif: 'Périmé', comment: '' });
      fetchStock();
  };

  const validerTransformation = async () => {
      if (!transfoData.srcId || !transfoData.srcQte || !transfoData.destId || !transfoData.destQte) return;
      const srcIng = ingredients.find(i => i.id === parseInt(transfoData.srcId));
      const destIng = ingredients.find(i => i.id === parseInt(transfoData.destId));

      if (!srcIng || !destIng) return;

      // 1. Baisser le stock source
      await supabase.from('ingredients').update({ stock_actuel: (srcIng.stock_actuel || 0) - parseFloat(transfoData.srcQte) }).eq('id', srcIng.id);
      
      // 2. Augmenter le stock destination
      await supabase.from('ingredients').update({ stock_actuel: (destIng.stock_actuel || 0) + parseFloat(transfoData.destQte) }).eq('id', destIng.id);

      // 3. Loguer (Optionnel mais propre)
      await supabase.from('mouvements_stock').insert({
          ingredient_id: srcIng.id,
          type_mouvement: 'Transformation Sortie',
          quantite: parseFloat(transfoData.srcQte),
          motif: `Transformé en ${destIng.nom}`
      });

      alert(`♻️ Transformation validée !\n${srcIng.nom} ➡️ ${destIng.nom}`);
      setShowTransfoModal(false);
      setTransfoData({ srcId: '', srcQte: '', destId: '', destQte: '' });
      fetchStock();
  };

  // --- LOGIQUE FINANCIERE ---
  const calculerPrixRevientRecette = () => {
      if (!recetteDetails) return 0;
      return recetteDetails.reduce((total, item) => {
          return total + ((item.ingredients?.prix_achat_moyen || 0) * item.quantite_requise);
      }, 0);
  };

  const getMargeApplicable = (categorie) => {
      return MARGES_FINANCIERES[categorie] || 0;
  };

  // --- GESTION IMPORT VENTES ---
  const handleSalesImport = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      alert("📂 Fichier reçu ! \nAnalyse des ventes en cours...\n(Simulation: Import réussi)");
  };
  const triggerSalesInput = () => document.getElementById('salesInput').click();

  // --- GESTION RECETTES ---
  const creerRecette = async () => {
      if (!newRecetteName) return;
      const { data, error } = await supabase.from('recettes').insert({ nom_recette: newRecetteName, categorie: newRecetteCat }).select().single();
      if (data) {
          setRecettes([...recettes, data]);
          setIsCreatingRecette(false);
          setNewRecetteName('');
          const { data: details } = await supabase.from('recette_ingredients').select('*, ingredients(*)').eq('recette_id', data.id);
          setRecetteDetails(details || []);
          setSelectedRecette(data);
      }
  };

  const ajouterIngredientAuPlat = async () => {
      if (!selectedRecette || !ajoutIngredientRecette || !qteAjoutRecette) return;
      const ing = ingredients.find(i => i.id === parseInt(ajoutIngredientRecette));
      const { error } = await supabase.from('recette_ingredients').insert({ recette_id: selectedRecette.id, ingredient_id: ing.id, quantite_requise: parseFloat(qteAjoutRecette), unite_recette: ing.unite });
      if (!error) {
          const { data } = await supabase.from('recette_ingredients').select('*, ingredients(*)').eq('recette_id', selectedRecette.id);
          setRecetteDetails(data || []);
          setAjoutIngredientRecette('');
          setQteAjoutRecette('');
      }
  };

  const supprimerIngredientRecette = async (idLigne) => {
      await supabase.from('recette_ingredients').delete().eq('id', idLigne);
      setRecetteDetails(recetteDetails.filter(r => r.id !== idLigne));
  };

  // --- FILTRES & INVENTAIRE ---
  const getFilteredIngredients = () => { return ingredients.filter(i => { const matchFamille = filtreFamille === 'Tout' || (i.famille || 'Divers') === filtreFamille; const matchFourn = filtreFournisseur === 'Tous' || (i.fournisseur || 'Autre') === filtreFournisseur; return matchFamille && matchFourn; }); };
  const startInventory = () => { setInventoryData(ingredients.map(i => ({ ...i, stock_physique: i.stock_actuel }))); };
  const updateInventoryLine = (id, val) => { setInventoryData(inventoryData.map(i => i.id === id ? { ...i, stock_physique: parseFloat(val) } : i)); };
  const validerInventaire = async () => { if(!confirm("Valider l'inventaire ?")) return; let totalValue = 0; for (const item of inventoryData) { await supabase.from('ingredients').update({ stock_actuel: item.stock_physique }).eq('id', item.id); totalValue += (item.stock_physique * item.prix_achat_moyen); } fetchStock(); alert(`✅ Inventaire validé !\nValeur : ${totalValue.toFixed(2)} €`); setActiveTab('rapport'); };
  const handleManualScan = (e) => { e.preventDefault(); const code = manualBarcode.trim(); if (!code) return; const found = inventoryData.find(i => i.code_barre === code); if (found) { const qte = prompt(`✅ TROUVÉ : ${found.nom}\nStock actuel : ${found.stock_physique} ${found.unite}\n\nNouvelle quantité ?`); if (qte !== null) { updateInventoryLine(found.id, qte); setManualBarcode(''); } } else { alert(`❌ Code barre "${code}" inconnu.`); setManualBarcode(''); } };

  // --- RECEPTION ---
  const demarrerReception = async (cmd) => { if (!cmd || !cmd.id) return; const { data: lignes, error } = await supabase.from('commande_lignes').select('*').eq('commande_id', cmd.id); if (error || !lignes) { alert("Erreur."); return; } const lignesControle = lignes.map(l => ({ ...l, qte_recue: l.quantite, statut_ligne: 'ok' })); setReceptionEnCours({ info: cmd, lignes: lignesControle }); setModeReception('commande'); };
  const updateLigneReception = (index, field, val) => { if (!receptionEnCours) return; const newLignes = [...receptionEnCours.lignes]; newLignes[index][field] = val; if (field === 'qte_recue') { if (parseFloat(val) < newLignes[index].quantite) { if(newLignes[index].statut_ligne === 'ok') newLignes[index].statut_ligne = 'rupture'; } else { newLignes[index].statut_ligne = 'ok'; } } setReceptionEnCours({ ...receptionEnCours, lignes: newLignes }); };
  const validerReceptionFinale = async () => { if(!confirm("Confirmer ?")) return; const itemsLitige = receptionEnCours.lignes.filter(l => l.statut_ligne === 'litige'); const hasLitige = itemsLitige.length > 0; for (const item of receptionEnCours.lignes) { if (item.qte_recue > 0) { const { data: ing } = await supabase.from('ingredients').select('stock_actuel, id').eq('nom', item.nom_ingredient).single(); if (ing) { await supabase.from('ingredients').update({ stock_actuel: ing.stock_actuel + parseFloat(item.qte_recue) }).eq('id', ing.id); } } await supabase.from('commande_lignes').update({ qte_recue: item.qte_recue, statut_ligne: item.statut_ligne }).eq('id', item.id); } await supabase.from('commandes').update({ status: 'received', date_reception: new Date(), has_litige: hasLitige }).eq('id', receptionEnCours.info.id); if (hasLitige) { const subject = `URGENT: Litige Livraison ${receptionEnCours.info.fournisseur}`; let body = `Anomalies ${receptionEnCours.info.reference_officielle} :\n\n`; itemsLitige.forEach(i => body += `- ${i.nom_ingredient} : Cmd ${i.quantite}, Reçu ${i.qte_recue}. (Manquant FACTURÉ)\n`); window.location.href = `mailto:admin@rpomb.be?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`; alert("🚨 ANOMALIE : Mail généré !"); } else { alert("✅ Stock mis à jour !"); } setReceptionEnCours(null); setModeReception('choix'); fetchHistorique(); fetchStock(); };

  // --- COMMUNE ---
  const saveIngredientDetails = async () => { if(!editingIngredient) return; await supabase.from('ingredients').update({ reference_fournisseur: editingIngredient.reference_fournisseur, code_barre: editingIngredient.code_barre, fournisseur: editingIngredient.fournisseur, unite: editingIngredient.unite, stock_ideal: editingIngredient.stock_ideal, allergenes: editingIngredient.allergenes, famille: editingIngredient.famille, prix_achat_moyen: editingIngredient.prix_achat_moyen }).eq('id', editingIngredient.id); setIngredients(ingredients.map(i => i.id === editingIngredient.id ? editingIngredient : i)); setEditingIngredient(null); };
  const toggleAllergen = (alg) => { const current = editingIngredient.allergenes || []; setEditingIngredient({...editingIngredient, allergenes: current.includes(alg) ? current.filter(a => a !== alg) : [...current, alg]}); };
  const getRecetteAllergenes = () => { const allAlg = new Set(); recetteDetails.forEach(item => { if(item.ingredients.allergenes) item.ingredients.allergenes.forEach(a => allAlg.add(a)); }); return Array.from(allAlg); };
  const triggerFileInput = () => document.getElementById('templateInput').click(); 
  const handleTemplateUpload = async (e, cmd) => { const file = e.target.files[0]; if (!file) return; setIsProcessingExcel(true); try { const COL_REFERENCE = 1; const COL_DESCRIPTION = 2; const COL_QUANTITE = 5; let refOfficielle = cmd.reference_officielle; if (!refOfficielle) { const dateNow = new Date(); const anneeShort = dateNow.getFullYear().toString().substr(-2); const { count } = await supabase.from('commandes').select('*', { count: 'exact', head: true }).eq('status', 'validated').ilike('reference_officielle', `%-${anneeShort}%`); const index = (count || 0) + 1; const sequence = index.toString().padStart(3, '0'); refOfficielle = `R708.01 - 226 - ${anneeShort}${sequence}`; await supabase.from('commandes').update({ status: 'validated', reference_officielle: refOfficielle }).eq('id', cmd.id); } const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(await file.arrayBuffer()); const worksheet = workbook.worksheets[0]; if (!worksheet) throw new Error("Fichier vide"); const cellRef = worksheet.getCell('F4'); if (cellRef) cellRef.value = refOfficielle; const cellDate = worksheet.getCell('F7'); if (cellDate) cellDate.value = new Date().toLocaleDateString(); const cellFourn = worksheet.getCell('D9'); if (cellFourn) cellFourn.value = cmd.fournisseur.toUpperCase(); let startRow = 23; worksheet.eachRow((row, rowNumber) => { row.eachCell((cell) => { if (cell.value && typeof cell.value === 'string' && cell.value.toString().toUpperCase().includes('DESCRIPTION')) { startRow = rowNumber + 1; } }); }); const { data: lignes } = await supabase.from('commande_lignes').select('*').eq('commande_id', cmd.id); const { data: stockRef } = await supabase.from('ingredients').select('nom, reference_fournisseur, unite'); lignes.forEach((l, index) => { const currentRow = startRow + index; const row = worksheet.getRow(currentRow); const ingredientLie = stockRef?.find(i => i.nom === l.nom_ingredient); const refProduit = ingredientLie?.reference_fournisseur || ""; const uniteReelle = ingredientLie?.unite || l.unite; row.getCell(COL_REFERENCE).value = refProduit; row.getCell(COL_DESCRIPTION).value = `${l.nom_ingredient} (${uniteReelle})`; row.getCell(COL_QUANTITE).value = Number(l.quantite); row.commit(); }); const buffer = await workbook.xlsx.writeBuffer(); const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }); saveAs(blob, `BC_${refOfficielle}_${cmd.fournisseur}.xlsx`); fetchHistorique(); setCommandeDetail(null); alert(`✅ Fichier généré !`); } catch (err) { console.error(err); alert(`ERREUR : ${err.message}`); } finally { setIsProcessingExcel(false); } };
  const validerEtUpload = () => triggerFileInput();
  const updateIngredientParam = async (id, f, v) => { await supabase.from('ingredients').update({ [f]: v }).eq('id', id); setIngredients(ingredients.map(i => i.id === id ? { ...i, [f]: v } : i)); };
  const getListeACommander = () => ingredients.filter(i => ((i.stock_ideal||0)-(i.stock_actuel||0))>0 && (filtreFournisseur==='Tous'||i.fournisseur===filtreFournisseur)).map(i=>({...i, qteACommander:(i.stock_ideal-i.stock_actuel)}));
  const envoyerCommande = async () => { const liste = getListeACommander(); if(liste.length===0 || !confirm("Envoyer ?")) return; const frn = [...new Set(liste.map(i=>i.fournisseur||'Autre'))]; for(const f of frn) { const items = liste.filter(i=>(i.fournisseur||'Autre')===f); const total = items.reduce((a,i)=>a+(i.qteACommander*i.prix_achat_moyen),0); const { data: c } = await supabase.from('commandes').insert({user_email:user.email, fournisseur:f, status:'pending', total_estime:total}).select().single(); if(c) await supabase.from('commande_lignes').insert(items.map(i=>({commande_id:c.id, nom_ingredient:i.nom, unite:i.unite, quantite:i.qteACommander, prix_estime:i.prix_achat_moyen}))); } fetchHistorique(); alert("✅ Envoyé !"); setViewCmd('historique'); };
  const voirDetail = async (cmd) => { const { data } = await supabase.from('commande_lignes').select('*').eq('commande_id', cmd.id); setCommandeDetail({Info:cmd, Lignes:data}); };
  const ajouterAuBon = () => { if (!selectedIng || !qteLivraison) return; const ingInfo = ingredients.find(i => i.id === parseInt(selectedIng)); setPanierLivraison([...panierLivraison, { id: ingInfo.id, nom: ingInfo.nom, unite: ingInfo.unite, qte: parseFloat(qteLivraison), nouveauPrix: (user.role === 'cook' || !prixLivraison) ? ingInfo.prix_achat_moyen : parseFloat(prixLivraison) }]); setQteLivraison(''); setPrixLivraison(''); setSelectedIng(''); };
  const validerLivraisonLibre = async () => { if (!confirm(`Valider l'entrée ?`)) return; for (const item of panierLivraison) { const { data: current } = await supabase.from('ingredients').select('stock_actuel').eq('id', item.id).single(); if (current) { const updateData = { stock_actuel: (current.stock_actuel || 0) + item.qte }; if (user.role !== 'cook') updateData.prix_achat_moyen = item.nouveauPrix; await supabase.from('ingredients').update(updateData).eq('id', item.id); } } setPanierLivraison([]); fetchStock(); alert("✅ Stock mis à jour !"); };

  if (!user) return <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans"><div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-sm text-center"><h1 className="text-3xl font-black text-slate-800 mb-6">RPOMB<span className="text-blue-600">.app</span></h1><form onSubmit={handleLogin} className="space-y-4"><input type="email" placeholder="Email" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" value={loginEmail} onChange={e=>setLoginEmail(e.target.value)}/><input type="password" placeholder="Mot de passe" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" value={loginPass} onChange={e=>setLoginPass(e.target.value)}/><button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-bold transition-all shadow-lg shadow-blue-200">CONNEXION</button></form></div></div>;

  return (
    <div className="max-w-md mx-auto bg-slate-50 min-h-screen pb-24 font-sans text-slate-800">
      <div className="bg-white p-4 shadow-sm sticky top-0 z-20 flex justify-between items-center border-b border-slate-100">
          <div className="flex items-center gap-2"><div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black">R</div><h1 className="font-bold text-lg text-slate-700">RPOMB</h1></div>
          <div className="flex items-center gap-3"><span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-full">{user.email.split('@')[0]}</span><button onClick={handleLogout} className="text-slate-400 hover:text-red-500"><LogOut size={20}/></button></div>
      </div>
      
      <div className="p-4">
        {/* MODAL PERTE (V26) */}
        {showPerteModal && (
            <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-in fade-in zoom-in border-l-8 border-red-500">
                    <h3 className="text-lg font-black text-red-600 mb-4 flex items-center gap-2"><Trash2/> Déclarer une Perte</h3>
                    <div className="space-y-4">
                        <div><label className="text-[10px] font-bold text-slate-400 uppercase">Produit perdu</label><select className="w-full border-2 border-slate-200 p-3 rounded-xl font-bold" value={perteData.id} onChange={e => setPerteData({...perteData, id: e.target.value})}><option value="">Choisir...</option>{ingredients.map(i => <option key={i.id} value={i.id}>{i.nom} ({i.stock_actuel} {i.unite})</option>)}</select></div>
                        <div className="flex gap-2">
                            <div className="w-1/2"><label className="text-[10px] font-bold text-slate-400 uppercase">Quantité</label><input type="number" className="w-full border-2 border-slate-200 p-3 rounded-xl font-bold text-red-600" placeholder="0.00" value={perteData.qte} onChange={e => setPerteData({...perteData, qte: e.target.value})} /></div>
                            <div className="w-1/2"><label className="text-[10px] font-bold text-slate-400 uppercase">Motif</label><select className="w-full border-2 border-slate-200 p-3 rounded-xl font-bold" value={perteData.motif} onChange={e => setPerteData({...perteData, motif: e.target.value})}>{MOTIFS_PERTE.map(m=><option key={m} value={m}>{m}</option>)}</select></div>
                        </div>
                        <div><label className="text-[10px] font-bold text-slate-400 uppercase">Commentaire (Facultatif)</label><input type="text" className="w-full border-2 border-slate-200 p-3 rounded-xl" placeholder="Détails..." value={perteData.comment} onChange={e => setPerteData({...perteData, comment: e.target.value})} /></div>
                        <div className="flex gap-2 mt-6"><button onClick={()=>setShowPerteModal(false)} className="flex-1 py-3 text-slate-500 font-bold">Annuler</button><button onClick={validerPerte} className="flex-1 bg-red-600 text-white py-3 rounded-xl font-bold shadow-lg">CONFIRMER PERTE</button></div>
                    </div>
                </div>
            </div>
        )}

        {/* MODAL TRANSFORMATION (V26) */}
        {showTransfoModal && (
            <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-in fade-in zoom-in border-l-8 border-green-500">
                    <h3 className="text-lg font-black text-green-600 mb-4 flex items-center gap-2"><RefreshCw/> Transformation</h3>
                    <div className="space-y-4">
                        <div className="bg-red-50 p-3 rounded-xl border border-red-100">
                            <label className="text-[10px] font-bold text-red-400 uppercase">SOURCE (Ce qu'on prend)</label>
                            <select className="w-full bg-white border border-red-200 p-2 rounded-lg mb-2 text-sm" value={transfoData.srcId} onChange={e => setTransfoData({...transfoData, srcId: e.target.value})}><option value="">Choisir produit...</option>{ingredients.map(i => <option key={i.id} value={i.id}>{i.nom}</option>)}</select>
                            <input type="number" className="w-full bg-white border border-red-200 p-2 rounded-lg text-center font-bold text-red-600" placeholder="Quantité retirée" value={transfoData.srcQte} onChange={e => setTransfoData({...transfoData, srcQte: e.target.value})} />
                        </div>
                        <div className="flex justify-center"><ArrowRightLeft className="text-slate-300"/></div>
                        <div className="bg-green-50 p-3 rounded-xl border border-green-100">
                            <label className="text-[10px] font-bold text-green-600 uppercase">DESTINATION (Ce qu'on crée)</label>
                            <select className="w-full bg-white border border-green-200 p-2 rounded-lg mb-2 text-sm" value={transfoData.destId} onChange={e => setTransfoData({...transfoData, destId: e.target.value})}><option value="">Choisir produit...</option>{ingredients.map(i => <option key={i.id} value={i.id}>{i.nom}</option>)}</select>
                            <input type="number" className="w-full bg-white border border-green-200 p-2 rounded-lg text-center font-bold text-green-600" placeholder="Quantité ajoutée" value={transfoData.destQte} onChange={e => setTransfoData({...transfoData, destQte: e.target.value})} />
                        </div>
                        <div className="flex gap-2 mt-6"><button onClick={()=>setShowTransfoModal(false)} className="flex-1 py-3 text-slate-500 font-bold">Annuler</button><button onClick={validerTransformation} className="flex-1 bg-green-600 text-white py-3 rounded-xl font-bold shadow-lg">VALIDER</button></div>
                    </div>
                </div>
            </div>
        )}

        {/* MODAL EDITION INGREDIENT */}
        {editingIngredient && (
            <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm max-h-[90vh] overflow-y-auto flex flex-col animate-in fade-in zoom-in duration-200">
                    <div className="p-4 border-b flex justify-between items-center bg-slate-50 rounded-t-2xl"><h3 className="font-black text-lg text-slate-800">{editingIngredient.nom}</h3><button onClick={() => setEditingIngredient(null)}><X size={24} className="text-slate-400 hover:text-slate-600"/></button></div>
                    <div className="p-4 space-y-4">
                        <div><label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Famille</label><select className="w-full border-slate-200 p-3 rounded-xl bg-slate-50 font-medium" value={editingIngredient.famille || 'Divers'} onChange={e => setEditingIngredient({...editingIngredient, famille: e.target.value})}>{FAMILLES_LIST.map(f=><option key={f} value={f}>{f}</option>)}</select></div>
                        <div><label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Code-Barre</label><input type="text" className="w-full border-slate-200 p-3 rounded-xl bg-slate-50 font-mono text-sm" placeholder="Scanner..." value={editingIngredient.code_barre || ''} onChange={e => setEditingIngredient({...editingIngredient, code_barre: e.target.value})} /></div>
                        <div><label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Référence Frn.</label><input type="text" className="w-full border-slate-200 p-3 rounded-xl bg-slate-50 text-sm" placeholder="ex: PO-JAM-001" value={editingIngredient.reference_fournisseur || ''} onChange={e => setEditingIngredient({...editingIngredient, reference_fournisseur: e.target.value})} /></div>
                        <div className="flex gap-2"><div className="w-1/2"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fournisseur</label><select className="w-full border-slate-200 p-3 rounded-xl bg-slate-50 text-sm" value={editingIngredient.fournisseur || 'Autre'} onChange={e => setEditingIngredient({...editingIngredient, fournisseur: e.target.value})}><option>Solucious</option><option>Bidfood</option><option>Pochet</option><option>Autre</option></select></div><div className="w-1/2"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Unité</label><select className="w-full border-slate-200 p-3 rounded-xl bg-slate-50 text-sm" value={editingIngredient.unite || 'kg'} onChange={e => setEditingIngredient({...editingIngredient, unite: e.target.value})}><option value="kg">kg (Kilo)</option><option value="L">L (Litre)</option><option value="pce">pce (Pièce)</option></select></div></div>
                        <div className="flex gap-2">
                            <div className="w-1/2"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Stock Idéal</label><input type="number" className="w-full border-slate-200 p-3 rounded-xl bg-slate-50 text-lg font-bold text-blue-600" value={editingIngredient.stock_ideal || 0} onChange={e => setEditingIngredient({...editingIngredient, stock_ideal: parseFloat(e.target.value)})} /></div>
                            <div className="w-1/2"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Prix Achat (€)</label><input type="number" className="w-full border-slate-200 p-3 rounded-xl bg-slate-50 text-lg font-bold text-green-600" value={editingIngredient.prix_achat_moyen || 0} onChange={e => setEditingIngredient({...editingIngredient, prix_achat_moyen: parseFloat(e.target.value)})} /></div>
                        </div>
                        <div className="bg-orange-50 p-4 rounded-xl border border-orange-100"><label className="text-[10px] font-bold text-orange-800 uppercase flex items-center gap-1 mb-3"><AlertTriangle size={12}/> Allergènes</label><div className="grid grid-cols-2 gap-2">{ALLERGENES_LIST.map(alg => (<label key={alg} className="flex items-center gap-2 text-xs text-orange-900 font-medium cursor-pointer"><input type="checkbox" className="accent-orange-500 w-4 h-4 rounded" checked={(editingIngredient.allergenes || []).includes(alg)} onChange={() => toggleAllergen(alg)} />{alg}</label>))}</div></div>
                    </div>
                    <div className="p-4 border-t mt-auto"><button onClick={saveIngredientDetails} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-bold shadow-lg shadow-blue-200 transition-all">ENREGISTRER</button></div>
                </div>
            </div>
        )}

        {/* MODAL CREATION RECETTE */}
        {isCreatingRecette && (
            <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-in fade-in zoom-in">
                    <h3 className="text-lg font-black text-slate-800 mb-4">Nouvelle Recette</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Nom du plat</label>
                            <input type="text" className="w-full border-2 border-slate-200 p-3 rounded-xl font-bold" placeholder="ex: Sandwich Thon Piquant" value={newRecetteName} onChange={e => setNewRecetteName(e.target.value)} />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Type (Pour Marge)</label>
                            <select className="w-full border-2 border-slate-200 p-3 rounded-xl font-bold" value={newRecetteCat} onChange={e => setNewRecetteCat(e.target.value)}>
                                {Object.keys(MARGES_FINANCIERES).map(cat => <option key={cat} value={cat}>{cat} (+{MARGES_FINANCIERES[cat].toFixed(2)}€)</option>)}
                            </select>
                        </div>
                        <div className="flex gap-2 mt-6">
                            <button onClick={()=>setIsCreatingRecette(false)} className="flex-1 py-3 text-slate-500 font-bold">Annuler</button>
                            <button onClick={creerRecette} className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold shadow-lg">Créer</button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* ONGLET INVENTAIRE */}
        {activeTab === 'inventaire' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                <h2 className="text-2xl font-black mb-6 text-slate-800 flex items-center gap-2"><List className="text-purple-600"/> Inventaire</h2>
                {inventoryData.length === 0 ? (
                    <div className="text-center py-10">
                        <div className="bg-purple-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"><List size={40} className="text-purple-600"/></div>
                        <h3 className="font-bold text-lg mb-2">Prêt à compter ?</h3>
                        <p className="text-slate-500 text-sm mb-8 px-6">Lancez l'inventaire pour mettre à jour les stocks réels et calculer la valeur.</p>
                        <button onClick={startInventory} className="w-full bg-purple-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-purple-200 hover:bg-purple-700 transition-all">DÉMARRER</button>
                    </div>
                ) : (
                    <div>
                        <div className="bg-slate-800 p-4 rounded-2xl mb-4 text-white shadow-lg"><form onSubmit={handleManualScan} className="flex gap-3 items-center"><Search className="text-slate-400"/><div className="flex-1"><label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Douchette / Clavier</label><input type="text" autoFocus className="w-full bg-transparent border-b border-slate-600 focus:border-white outline-none text-xl font-mono font-bold py-1" placeholder="Bip ici..." value={manualBarcode} onChange={(e) => setManualBarcode(e.target.value)}/></div><button type="submit" className="bg-blue-600 px-4 py-2 rounded-lg font-bold text-sm hover:bg-blue-500 transition-colors">OK</button></form></div>
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 mb-20 overflow-hidden">
                            <div className="p-3 bg-slate-50 border-b border-slate-100 font-bold text-slate-400 text-[10px] uppercase flex tracking-wider"><span className="w-1/2">Produit</span><span className="w-1/4 text-center">Théo.</span><span className="w-1/4 text-center">Réel</span></div>
                            <div className="divide-y divide-slate-50 max-h-[55vh] overflow-y-auto">
                                {inventoryData.map(i => (
                                    <div key={i.id} className={`flex items-center p-3 text-sm transition-colors ${i.stock_physique !== i.stock_actuel ? 'bg-purple-50/50' : ''}`}>
                                        <div className="w-1/2 font-medium text-slate-700 truncate">{i.nom}</div>
                                        <div className="w-1/4 text-center text-slate-400 text-xs">{i.stock_actuel?.toFixed(2)}</div>
                                        <div className="w-1/4"><input type="number" className={`w-full border-2 rounded-lg p-2 text-center font-bold outline-none focus:ring-2 focus:ring-purple-500 ${i.stock_physique !== i.stock_actuel ? 'border-purple-200 text-purple-700 bg-white' : 'border-slate-100 text-slate-800 bg-slate-50'}`} value={i.stock_physique} onChange={(e) => updateInventoryLine(i.id, e.target.value)} /></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="fixed bottom-24 left-4 right-4"><button onClick={validerInventaire} className="w-full bg-green-600 text-white py-4 rounded-xl font-bold shadow-xl shadow-green-200 hover:bg-green-700 transition-all">VALIDER & TERMINER</button></div>
                    </div>
                )}
            </div>
        )}

        {/* NOUVEL ONGLET LIVRAISON (AVEC PERTE & TRANSFO) */}
        {activeTab === 'livraison' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                {modeReception === 'choix' && ( 
                    <div className="space-y-6"> 
                        <h2 className="text-2xl font-black mb-6 text-slate-800 flex items-center gap-2"><Truck className="text-blue-600"/> Réception & Stock</h2>
                        
                        <div>
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2"><Clock size={12}/> En attente</h3>
                            {commandesEnAttente.length === 0 ? 
                                <div className="p-6 border-2 border-dashed border-slate-200 rounded-xl text-center text-slate-400 text-sm">Rien à réceptionner aujourd'hui 😴</div> 
                                : 
                                <div className="space-y-3">
                                    {commandesEnAttente.map(c => ( 
                                        <div key={c.id} onClick={() => demarrerReception(c)} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 cursor-pointer hover:shadow-md hover:border-blue-200 transition-all flex justify-between items-center group"> 
                                            <div><div className="font-bold text-slate-800 text-lg group-hover:text-blue-600 transition-colors">{c.fournisseur}</div><div className="text-xs text-slate-400 font-mono mt-1">{c.reference_officielle}</div></div>
                                            <div className="bg-blue-50 text-blue-600 px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1 group-hover:bg-blue-600 group-hover:text-white transition-colors">GO <Search size={12}/></div> 
                                        </div> 
                                    ))}
                                </div>
                            }
                        </div>

                        <div className="pt-4 space-y-3">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Mouvements Internes</h3>
                            <button onClick={() => setModeReception('libre')} className="w-full bg-white border border-slate-200 text-slate-600 py-4 rounded-xl font-bold shadow-sm hover:bg-slate-50 transition-all flex items-center justify-center gap-2"><ShoppingBag size={18}/> Entrée Libre</button> 
                            <div className="grid grid-cols-2 gap-3">
                                <button onClick={() => setShowPerteModal(true)} className="bg-red-50 text-red-600 py-4 rounded-xl font-bold border border-red-100 hover:bg-red-100 transition-all flex flex-col items-center gap-1"><Trash2 size={24}/> Déclarer Perte</button>
                                <button onClick={() => setShowTransfoModal(true)} className="bg-green-50 text-green-600 py-4 rounded-xl font-bold border border-green-100 hover:bg-green-100 transition-all flex flex-col items-center gap-1"><RefreshCw size={24}/> Transformer</button>
                            </div>
                        </div> 
                    </div> 
                )}
                
                {modeReception === 'commande' && receptionEnCours && ( 
                    <div className="bg-white rounded-2xl shadow-xl overflow-hidden animate-in zoom-in duration-200"> 
                        <div className="bg-slate-900 p-6 text-white flex justify-between items-center"> 
                            <div><h3 className="font-bold text-lg">{receptionEnCours.info.fournisseur}</h3><div className="text-xs text-slate-400 font-mono mt-1">{receptionEnCours.info.reference_officielle}</div></div> 
                            <button onClick={() => setModeReception('choix')} className="bg-white/10 p-2 rounded-full hover:bg-white/20 transition-colors"><X size={20}/></button> 
                        </div> 
                        <div className="p-3 bg-amber-50 text-xs font-bold text-amber-800 border-b border-amber-100 flex items-center justify-center gap-2"> <AlertTriangle size={14}/> Signalez les manquants facturés ! </div> 
                        <div className="divide-y divide-slate-50 max-h-[60vh] overflow-y-auto"> 
                            {receptionEnCours.lignes.map((item, idx) => ( 
                                <div key={item.id} className={`p-4 transition-colors ${item.statut_ligne === 'litige' ? 'bg-red-50' : item.statut_ligne === 'rupture' ? 'bg-slate-100 opacity-60' : ''}`}> 
                                    <div className="flex justify-between items-center mb-3"> <span className="font-bold text-slate-700">{item.nom_ingredient}</span> <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-lg">{item.quantite} {item.unite}</span> </div> 
                                    <div className="flex gap-3 items-center"> 
                                        <div className="flex-1 relative">
                                            <input type="number" className={`w-full border-2 p-3 rounded-xl text-center font-bold text-lg outline-none focus:ring-2 ${item.qte_recue < item.quantite ? 'border-red-200 text-red-600 focus:ring-red-500' : 'border-slate-100 text-green-600 focus:ring-green-500'}`} value={item.qte_recue} onChange={(e) => updateLigneReception(idx, 'qte_recue', e.target.value)} /> 
                                            <span className="absolute right-3 top-4 text-xs font-bold text-slate-300">{item.unite}</span>
                                        </div>
                                        <div className="w-1/2"> {item.qte_recue < item.quantite ? ( <select className={`w-full p-3 rounded-xl text-xs font-bold border-2 outline-none ${item.statut_ligne === 'litige' ? 'bg-red-600 text-white border-red-600' : 'bg-slate-200 text-slate-600 border-slate-200'}`} value={item.statut_ligne} onChange={(e) => updateLigneReception(idx, 'statut_ligne', e.target.value)} > <option value="rupture">Rupture (0€)</option> <option value="litige">LITIGE (Facturé)</option> </select> ) : ( <div className="text-xs font-bold text-green-600 flex items-center justify-center gap-1 bg-green-50 p-3 rounded-xl border border-green-100"><CheckSquare size={16}/> OK</div> )} </div> 
                                    </div> 
                                </div> 
                            ))} 
                        </div> 
                        <div className="p-4 border-t border-slate-100"> <button onClick={validerReceptionFinale} className="w-full bg-green-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-green-200 hover:bg-green-700 transition-all text-lg">VALIDER L'ENTRÉE</button> </div> 
                    </div> 
                )}
                
                {modeReception === 'libre' && ( 
                    <div className="bg-white rounded-2xl shadow-xl overflow-hidden animate-in slide-in-from-right duration-200">
                        <div className="bg-slate-800 p-4 text-white flex items-center gap-3">
                            <button onClick={() => setModeReception('choix')}><ChevronLeft/></button>
                            <h3 className="font-bold">Entrée Libre</h3>
                        </div>
                        <div className="p-4 space-y-4">
                            <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-medium" onChange={e=>setSelectedIng(e.target.value)}><option>Choisir produit...</option>{ingredients.map(i=><option key={i.id} value={i.id}>{i.nom}</option>)}</select>
                            <div className="flex gap-3">
                                <input type="number" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-center font-bold" placeholder="Qté (+)" value={qteLivraison} onChange={e=>setQteLivraison(e.target.value)}/>
                                {user.role!=='cook'&&<input type="number" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-center font-bold" placeholder="Prix (€)" value={prixLivraison} onChange={e=>setPrixLivraison(e.target.value)}/>}
                            </div>
                            <button onClick={ajouterAuBon} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold flex justify-center gap-2 items-center hover:bg-blue-700"><Plus size={18}/> AJOUTER</button>
                        </div>
                        {panierLivraison.length>0 && <div className="bg-slate-50 p-4 border-t border-slate-100">
                            {panierLivraison.map((item,i)=><div key={i} className="flex justify-between py-3 border-b border-slate-200 last:border-0 text-sm"><span>{item.nom}</span><span className="font-bold text-green-600">+{item.qte} {item.unite}</span></div>)}
                            <button onClick={validerLivraisonLibre} className="w-full mt-4 bg-green-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-green-200 hover:bg-green-700">CONFIRMER</button>
                        </div>}
                    </div>
                )}
            </div>
        )}

        {/* DASHBOARD COMMANDES */}
        {activeTab === 'commandes' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                {viewCmd === 'menu' && !commandeDetail && (
                    <div className="space-y-6">
                        <h2 className="text-2xl font-black mb-6 text-slate-800 flex items-center gap-2"><ShoppingBag className="text-blue-600"/> Commandes</h2>
                        <div className="grid grid-cols-2 gap-4">
                            <button onClick={() => setViewCmd('creer')} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center gap-3 hover:border-blue-500 hover:shadow-md transition-all group h-40">
                                <div className="bg-blue-50 p-4 rounded-full group-hover:bg-blue-600 transition-colors"><ShoppingBag size={32} className="text-blue-600 group-hover:text-white transition-colors"/></div>
                                <span className="font-bold text-slate-700">Nouvelle Cmd</span>
                            </button>
                            <button onClick={() => setViewCmd('historique')} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center gap-3 hover:border-blue-500 hover:shadow-md transition-all group h-40">
                                <div className="bg-amber-50 p-4 rounded-full group-hover:bg-amber-500 transition-colors"><FileText size={32} className="text-amber-600 group-hover:text-white transition-colors"/></div>
                                <span className="font-bold text-slate-700">Historique</span>
                            </button>
                            {user.role !== 'cook' && (
                                <>
                                <button onClick={() => setViewCmd('stocks')} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center gap-3 hover:border-blue-500 hover:shadow-md transition-all group h-40">
                                    <div className="bg-slate-50 p-4 rounded-full group-hover:bg-slate-600 transition-colors"><Settings size={32} className="text-slate-600 group-hover:text-white transition-colors"/></div>
                                    <span className="font-bold text-slate-700">Gérer Stocks</span>
                                </button>
                                <button onClick={() => setViewCmd('ventes')} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center gap-3 hover:border-blue-500 hover:shadow-md transition-all group h-40">
                                    <div className="bg-green-50 p-4 rounded-full group-hover:bg-green-600 transition-colors"><Banknote size={32} className="text-green-600 group-hover:text-white transition-colors"/></div>
                                    <span className="font-bold text-slate-700">Finance & Ventes</span>
                                </button>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* VUE IMPORT VENTES */}
                {viewCmd === 'ventes' && (
                    <div className="animate-in slide-in-from-right duration-200">
                        <div className="flex items-center gap-3 mb-4">
                            <button onClick={() => setViewCmd('menu')} className="bg-white border border-slate-200 p-2 rounded-xl text-slate-500 hover:bg-slate-50"><ChevronLeft/></button>
                            <h3 className="font-bold text-lg">Import Ventes</h3>
                        </div>
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 text-center">
                            <div className="bg-green-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"><FileSpreadsheet size={40} className="text-green-600"/></div>
                            <h3 className="font-bold text-lg mb-2">Rapport Caisse</h3>
                            <p className="text-slate-500 text-sm mb-8 px-6">Importez le fichier Excel/CSV de la caisse pour mettre à jour les stocks vendus et calculer le chiffre d'affaires.</p>
                            <input type="file" id="salesInput" style={{display:'none'}} accept=".xlsx,.csv" onChange={handleSalesImport}/>
                            <button onClick={triggerSalesInput} className="w-full bg-green-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-green-200 hover:bg-green-700 transition-all flex items-center justify-center gap-2"><Upload size={20}/> IMPORTER FICHIER</button>
                        </div>
                    </div>
                )}

                {/* VUE CREER COMMANDE */}
                {viewCmd === 'creer' && !commandeDetail && (
                    <div className="animate-in slide-in-from-right duration-200">
                        <div className="flex items-center gap-3 mb-4">
                            <button onClick={() => setViewCmd('menu')} className="bg-white border border-slate-200 p-2 rounded-xl text-slate-500 hover:bg-slate-50"><ChevronLeft/></button>
                            <h3 className="font-bold text-lg">Nouvelle Commande</h3>
                        </div>
                        
                        {/* FILTRES FAMILLE & FOURNISSEUR */}
                        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-4 sticky top-20 z-10">
                            <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide">
                                {FAMILLES_LIST.map(f => (
                                    <button key={f} onClick={() => setFiltreFamille(f)} className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${filtreFamille === f ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500'}`}>{f}</button>
                                ))}
                            </div>
                            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide border-t border-slate-50 pt-3">
                                {['Tous', 'Solucious', 'Bidfood', 'Pochet', 'Autre'].map(f => (
                                    <button key={f} onClick={() => setFiltreFournisseur(f)} className={`px-3 py-1 rounded-lg text-[10px] font-bold border transition-all ${filtreFournisseur === f ? 'border-blue-600 text-blue-600 bg-blue-50' : 'border-slate-200 text-slate-400'}`}>{f}</button>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                            {getFilteredIngredients().filter(i => ((i.stock_ideal||0)-(i.stock_actuel||0))>0).length === 0 ? 
                                <div className="p-10 text-center text-slate-400"><div className="bg-green-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"><CheckSquare className="text-green-500" size={32}/></div><p>Stock au complet ! Rien à commander.</p></div> 
                                : 
                                getFilteredIngredients().filter(i => ((i.stock_ideal||0)-(i.stock_actuel||0))>0).map(i => (
                                    <div key={i.id} className="flex justify-between items-center p-4 border-b border-slate-50 last:border-0">
                                        <div><div className="font-bold text-slate-700">{i.nom}</div><div className="text-[10px] font-bold text-slate-400 bg-slate-50 inline-block px-2 rounded mt-1">{i.fournisseur} • {i.famille}</div></div>
                                        <div className="font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-lg">+{((i.stock_ideal || 0) - (i.stock_actuel || 0)).toFixed(2)} {i.unite}</div>
                                    </div>
                                ))
                            }
                        </div>
                        
                        {getFilteredIngredients().filter(i => ((i.stock_ideal||0)-(i.stock_actuel||0))>0).length > 0 && 
                            <div className="fixed bottom-24 left-4 right-4"><button onClick={envoyerCommande} className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold shadow-xl shadow-blue-200 flex justify-center gap-2 items-center hover:bg-blue-700 transition-all"><Send size={20}/> ENVOYER COMMANDES</button></div>
                        }
                    </div>
                )}

                {/* VUE HISTORIQUE */}
                {viewCmd === 'historique' && !commandeDetail && (
                    <div className="animate-in slide-in-from-right duration-200">
                        <div className="flex items-center gap-3 mb-4">
                            <button onClick={() => setViewCmd('menu')} className="bg-white border border-slate-200 p-2 rounded-xl text-slate-500 hover:bg-slate-50"><ChevronLeft/></button>
                            <h3 className="font-bold text-lg">Historique</h3>
                        </div>
                        <div className="space-y-3">
                            {historiqueCommandes.map(c => (
                                <div key={c.id} onClick={() => voirDetail(c)} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 cursor-pointer hover:border-blue-200 transition-all flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${c.status === 'received' ? 'bg-slate-100 text-slate-400' : c.status === 'pending' ? 'bg-orange-100 text-orange-500' : 'bg-green-100 text-green-600'}`}>
                                            {c.status === 'received' ? <CheckSquare size={18}/> : c.status === 'pending' ? <Clock size={18}/> : <Send size={18}/>}
                                        </div>
                                        <div><div className="font-bold text-slate-700">{c.fournisseur}</div><div className="text-xs text-slate-400">{new Date(c.created_at).toLocaleDateString()} • {c.reference_officielle || 'Attente'}</div></div>
                                    </div>
                                    {c.has_litige && <AlertTriangle size={18} className="text-red-500"/>}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* VUE STOCKS (REGLAGES) */}
                {viewCmd === 'stocks' && (
                    <div className="animate-in slide-in-from-right duration-200">
                        <div className="flex items-center gap-3 mb-4">
                            <button onClick={() => setViewCmd('menu')} className="bg-white border border-slate-200 p-2 rounded-xl text-slate-500 hover:bg-slate-50"><ChevronLeft/></button>
                            <h3 className="font-bold text-lg">Base Ingrédients</h3>
                        </div>
                        <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 mb-4 sticky top-20 z-10 overflow-x-auto whitespace-nowrap scrollbar-hide">
                            {FAMILLES_LIST.map(f => (
                                <button key={f} onClick={() => setFiltreFamille(f)} className={`mr-2 px-3 py-1 rounded-lg text-xs font-bold transition-colors ${filtreFamille === f ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500'}`}>{f}</button>
                            ))}
                        </div>
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                            <div className="p-3 bg-slate-50 border-b border-slate-100 font-bold text-slate-400 text-[10px] uppercase flex tracking-wider"><span className="w-2/5">Produit</span><span className="w-1/5 text-center">Ref.</span><span className="w-1/5 text-center">Frn.</span><span className="w-1/5 text-center">Edit</span></div>
                            <div className="divide-y divide-slate-50 max-h-[65vh] overflow-y-auto">
                                {getFilteredIngredients().map(i => (
                                    <div key={i.id} className="flex items-center p-3 text-xs hover:bg-slate-50 transition-colors">
                                        <div className="w-2/5 font-medium text-slate-700 truncate">{i.nom} {(i.allergenes && i.allergenes.length > 0) && <span className="ml-1 text-[8px]">⚠️</span>}</div>
                                        <div className="w-1/5 text-center text-slate-400 truncate">{i.reference_fournisseur || '-'}</div>
                                        <div className="w-1/5 text-center text-slate-500">{i.fournisseur}</div>
                                        <div className="w-1/5 flex justify-center"><button onClick={() => setEditingIngredient(i)} className="bg-white border border-slate-200 p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"><Edit3 size={14}/></button></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* DETAIL COMMANDE */}
                {commandeDetail && (
                    <div className="bg-white rounded-2xl shadow-xl overflow-hidden animate-in zoom-in duration-200">
                        <div className="bg-slate-800 p-6 text-white flex justify-between items-start">
                            <div><h2 className="text-xl font-bold">{commandeDetail.Info.fournisseur}</h2><div className="text-xs text-slate-400 mt-1 font-mono">{commandeDetail.Info.reference_officielle}</div></div>
                            <button onClick={()=>setCommandeDetail(null)} className="bg-white/10 p-2 rounded-full hover:bg-white/20 transition-colors"><X size={20}/></button>
                        </div>
                        <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
                            {commandeDetail.Lignes.map(l => (
                                <div key={l.id} className="flex justify-between text-sm border-b border-slate-50 pb-2 last:border-0">
                                    <span className="text-slate-600">{l.nom_ingredient}</span>
                                    <span className="font-bold text-slate-800">{l.quantite} {l.unite}</span>
                                </div>
                            ))}
                        </div>
                        {user.role !== 'cook' && (
                            <div className="p-4 bg-slate-50 border-t border-slate-100">
                                <input type="file" id="templateInput" style={{display:'none'}} accept=".xlsx" onChange={(e)=>handleTemplateUpload(e, commandeDetail.Info)}/>
                                <button onClick={validerEtUpload} disabled={isProcessingExcel} className="w-full bg-green-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-green-200 flex justify-center gap-2 hover:bg-green-700 items-center transition-all">
                                    {isProcessingExcel ? <Clock className="animate-spin"/> : <Upload size={18}/>} 
                                    {commandeDetail.Info.status === 'pending' ? 'GÉNÉRER EXCEL' : 'RE-GÉNÉRER'}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        )}

        {/* RECETTES */}
        {activeTab === 'recettes' && !selectedRecette && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2"><ChefHat className="text-orange-500"/> Recettes</h2>
                    <button onClick={() => setIsCreatingRecette(true)} className="bg-orange-500 text-white px-4 py-2 rounded-xl font-bold shadow-lg hover:bg-orange-600 flex items-center gap-2 text-sm"><Plus size={16}/> Créer</button>
                </div>
                <div className="grid gap-3">
                    {recettes.map(r => (
                        <div key={r.id} onClick={async()=>{const{data}=await supabase.from('recette_ingredients').select('*, ingredients(*)').eq('recette_id',r.id);setRecetteDetails(data||[]);setSelectedRecette(r)}} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 cursor-pointer hover:border-orange-200 hover:shadow-md transition-all flex justify-between items-center">
                            <div className="font-bold text-lg text-slate-700">{r.nom_recette}</div>
                            <div className="bg-orange-50 text-orange-600 text-xs px-2 py-1 rounded font-bold">{r.categorie || 'Plat'}</div>
                        </div>
                    ))}
                </div>
            </div>
        )}
        
        {/* DETAIL RECETTE (FINANCES INTEGREES) */}
        {activeTab === 'recettes' && selectedRecette && (
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden animate-in zoom-in duration-200">
                <div className="bg-orange-500 p-6 text-white flex justify-between items-start">
                    <div>
                        <h2 className="text-xl font-bold">{selectedRecette.nom_recette}</h2>
                        <div className="text-xs bg-white/20 inline-block px-2 py-1 rounded mt-1">{selectedRecette.categorie || 'Plat'} (+{getMargeApplicable(selectedRecette.categorie || 'Autre').toFixed(2)}€)</div>
                    </div>
                    <button onClick={()=>setSelectedRecette(null)} className="bg-white/20 p-2 rounded-full hover:bg-white/30 transition-colors"><X size={20}/></button>
                </div>
                <div className="p-6">
                    {/* INFO FINANCIERE */}
                    <div className="flex gap-2 mb-6">
                        <div className="flex-1 bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                            <div className="text-xs font-bold text-slate-400 uppercase">Coût Matière</div>
                            <div className="text-xl font-black text-slate-700">{calculerPrixRevientRecette().toFixed(2)} €</div>
                        </div>
                        <div className="flex-1 bg-green-50 p-3 rounded-xl border border-green-100 text-center">
                            <div className="text-xs font-bold text-green-600 uppercase">Prix Vente Min</div>
                            <div className="text-xl font-black text-green-700">{(calculerPrixRevientRecette() + getMargeApplicable(selectedRecette.categorie || 'Autre')).toFixed(2)} €</div>
                        </div>
                    </div>

                    <div className="mb-6 flex flex-wrap gap-2">
                        {getRecetteAllergenes().length > 0 ? getRecetteAllergenes().map(a => (<span key={a} className="bg-orange-100 text-orange-800 text-xs font-bold px-3 py-1 rounded-full border border-orange-200 shadow-sm">{a}</span>)) : <span className="text-xs text-slate-400 italic bg-slate-100 px-3 py-1 rounded-full">Aucun allergène</span>}
                    </div>
                    
                    <div className="space-y-4 mb-6">
                        {recetteDetails.map(i => (
                            <div key={i.id} className="flex justify-between text-sm border-b border-slate-50 pb-2 last:border-0 group">
                                <span className="text-slate-600">{i.ingredients.nom}</span>
                                <div className="flex items-center gap-3">
                                    <span className="font-black text-slate-800">{i.quantite_requise} {i.unite_recette}</span>
                                    <button onClick={() => supprimerIngredientRecette(i.id)} className="text-red-300 hover:text-red-500"><Trash2 size={14}/></button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">Ajouter Ingrédient</h4>
                        <div className="flex gap-2 mb-2">
                            <select className="flex-1 p-2 rounded-lg border border-slate-200 text-sm" onChange={e => setAjoutIngredientRecette(e.target.value)} value={ajoutIngredientRecette || ''}>
                                <option value="">Choisir...</option>
                                {ingredients.map(i => <option key={i.id} value={i.id}>{i.nom}</option>)}
                            </select>
                            <input type="number" className="w-20 p-2 rounded-lg border border-slate-200 text-sm font-bold" placeholder="Qté" value={qteAjoutRecette} onChange={e => setQteAjoutRecette(e.target.value)} />
                        </div>
                        <button onClick={ajouterIngredientAuPlat} className="w-full bg-slate-800 text-white py-2 rounded-lg font-bold text-sm">AJOUTER</button>
                    </div>
                </div>
            </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 flex justify-around p-2 pb-6 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-30">
        <button onClick={()=>{setActiveTab('commandes');setViewCmd('menu')}} className={`p-3 rounded-2xl transition-all flex flex-col items-center gap-1 ${activeTab==='commandes'?'text-blue-600 bg-blue-50 scale-110 shadow-sm':'text-slate-300 hover:text-slate-500'}`}><ShoppingBag size={24}/><span className="text-[10px] font-bold">CMD</span></button>
        <button onClick={()=>setActiveTab('recettes')} className={`p-3 rounded-2xl transition-all flex flex-col items-center gap-1 ${activeTab==='recettes'?'text-orange-500 bg-orange-50 scale-110 shadow-sm':'text-slate-300 hover:text-slate-500'}`}><ChefHat size={24}/><span className="text-[10px] font-bold">COOK</span></button>
        <button onClick={()=>{setActiveTab('livraison');setModeReception('choix')}} className={`p-3 rounded-2xl transition-all flex flex-col items-center gap-1 ${activeTab==='livraison'?'text-blue-600 bg-blue-50 scale-110 shadow-sm':'text-slate-300 hover:text-slate-500'}`}><Truck size={24}/><span className="text-[10px] font-bold">STOCK</span></button>
        <button onClick={()=>setActiveTab('inventaire')} className={`p-3 rounded-2xl transition-all flex flex-col items-center gap-1 ${activeTab==='inventaire'?'text-purple-600 bg-purple-50 scale-110 shadow-sm':'text-slate-300 hover:text-slate-500'}`}><List size={24}/><span className="text-[10px] font-bold">INV.</span></button>
      </div>
    </div>
  );
}