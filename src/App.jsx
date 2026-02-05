import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  TrendingUp, FileSpreadsheet, Truck, Plus, Trash2, ChefHat, Edit3, LogOut,
  ShoppingBag, CheckSquare, Send, Clock, Upload, AlertTriangle, X, Search,
  List, FileText, ChevronLeft, Package, Grid, AlertCircle, Calendar, Settings,
  Euro, Calculator, Banknote, RefreshCw, ArrowRightLeft, Sparkles, ShieldAlert,
  UserCheck, ChevronDown, ChevronRight, Filter, Activity, Eye, PieChart,
  ShoppingCart, Coffee, Beer, Utensils, IceCream, Sandwich, Save, Crown,
  Lock, MapPin, Camera, Mail, Ban, CheckCircle
} from 'lucide-react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

if (typeof global === 'undefined') { window.global = window; }

// --- CONFIGURATION ---
const SUPABASE_URL = 'https://ofbehieunbdhmhjgdgcc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9mYmVoaWV1bmJkaG1oamdkZ2NjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MjU2MDgsImV4cCI6MjA4NDUwMTYwOH0._qz6-Nc8df_-be9ik-aLAOhJHijxwxBWm_pZSQKypuM';
const GEMINI_API_KEY = "AIzaSyCXY1yNb0j2U30a68YvXIq9pWhJkvcERyI"; 

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const ALLERGENES_LIST = ['Gluten', 'Crustacés', 'Œufs', 'Poissons', 'Arachides', 'Soja', 'Lait', 'Fruits à coque', 'Céleri', 'Moutarde', 'Sésame', 'Sulfites', 'Lupin', 'Mollusques'];
const FAMILLES_LIST = ['Tout', 'Frais', 'Surgelé', 'Epicerie', 'Légumes', 'Viande', 'Emballage', 'Entretien', 'Boisson', 'Vidange', 'Divers'];
const FAMILLES_VENTES = ['Sandwich Froid', 'Sandwich Chaud', 'Salade', 'Boisson', 'Dessert', 'Snack']; 
const RECETTE_STRUCTURE = {
  'Boissons': ['Boissons Chaudes', 'Softs'],
  'Boissons Alcoolisées': ['Bières', 'Vins'],
  'Fournitures': ['Fournitures'],
  'Petits Plaisirs': ['Confiseries', 'En-cas fait maison', 'En-cas acheté fait', 'Fruits', 'Produits laitiers'],
  'Petite Restauration': ['Sandwiches - Ciabatta (Froid)', 'Panini - Provencette - Croques (Chaud)', 'Potage', 'Salade & bowls', 'Cornet de pâtes', 'Snacks'],
  'Repas': ['Plat du jour']
};
const MARGES_FINANCIERES = { 'Petite Restauration': 0.70, 'Boissons': 0.50, 'Boissons Alcoolisées': 0.60, 'Petits Plaisirs': 0.40, 'Repas': 0.75, 'Fournitures': 0.00 };

export default function App() {
  const [session, setSession] = useState(null);
  const [userProfile, setUserProfile] = useState(null); 
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');

  // GESTION MULTI-SITES
  const [activeSiteId, setActiveSiteId] = useState(null);
  const [availableSites, setAvailableSites] = useState([]);

  // DATA
  const [activeTab, setActiveTab] = useState('commandes');
  const [ingredients, setIngredients] = useState([]);
  const [recettes, setRecettes] = useState([]);
  const [historiqueCommandes, setHistoriqueCommandes] = useState([]);
  const [commandeDetail, setCommandeDetail] = useState(null);
  const [isProcessingExcel, setIsProcessingExcel] = useState(false);

  // WORKFLOW STATES (V61)
  const [showRefusalModal, setShowRefusalModal] = useState(false);
  const [refusalReason, setRefusalReason] = useState('');
  const [commandToRefuse, setCommandToRefuse] = useState(null);

  // SCAN IA STATES
  const [showScanModal, setShowScanModal] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState([]); 
  const fileInputRef = useRef(null);

  // UI STATES
  const [expandedMonths, setExpandedMonths] = useState([]);
  const [historyFilterFrn, setHistoryFilterFrn] = useState('Tous');
  const [inventoryMode, setInventoryMode] = useState('view');
  const [inventoryData, setInventoryData] = useState([]); 
  const [manualBarcode, setManualBarcode] = useState('');
  const [salesData, setSalesData] = useState([]);
  const [salesPeriod, setSalesPeriod] = useState('month'); 
  const [salesFilterFam, setSalesFilterFam] = useState('Tout');
  const [cart, setCart] = useState([]); 
  const [showAddArticleModal, setShowAddArticleModal] = useState(false); 
  const [selectedRecette, setSelectedRecette] = useState(null);
  const [recetteDetails, setRecetteDetails] = useState([]);
  const [isCreatingRecette, setIsCreatingRecette] = useState(false);
  const [newRecetteName, setNewRecetteName] = useState('');
  const [newRecetteFamille, setNewRecetteFamille] = useState('Petite Restauration'); 
  const [newRecetteSousFamille, setNewRecetteSousFamille] = useState('Sandwiches - Ciabatta (Froid)'); 
  const [filterRecetteFamily, setFilterRecetteFamily] = useState('Toutes'); 
  const [ajoutIngredientRecette, setAjoutIngredientRecette] = useState(null); 
  const [qteAjoutRecette, setQteAjoutRecette] = useState('');
  const [editRecetteFam, setEditRecetteFam] = useState('');
  const [editRecetteSubFam, setEditRecetteSubFam] = useState('');
  const [editingIngredient, setEditingIngredient] = useState(null);
  const [modeReception, setModeReception] = useState('choix');
  const [commandesEnAttente, setCommandesEnAttente] = useState([]);
  const [receptionEnCours, setReceptionEnCours] = useState(null);
  const [panierLivraison, setPanierLivraison] = useState([]);
  const [selectedIng, setSelectedIng] = useState('');
  const [qteLivraison, setQteLivraison] = useState('');
  const [prixLivraison, setPrixLivraison] = useState('');
  const [viewCmd, setViewCmd] = useState('menu'); 
  const [filtreFournisseur, setFiltreFournisseur] = useState('Tous');
  const [filtreFamille, setFiltreFamille] = useState('Tout'); 
  const [showPerteModal, setShowPerteModal] = useState(false);
  const [showTransfoModal, setShowTransfoModal] = useState(false);
  const [perteData, setPerteData] = useState({ id: '', qte: '', motif: 'Périmé', comment: '' });
  const [transfoData, setTransfoData] = useState({ srcId: '', srcQte: '', destId: '', destQte: '' });
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState('');
  const [showAiModal, setShowAiModal] = useState(false);
  const [pendingIngredients, setPendingIngredients] = useState([]);
  const [showCreateFournisseur, setShowCreateFournisseur] = useState(false);
  const [showCreateIngredient, setShowCreateIngredient] = useState(false);
  const [newFournData, setNewFournData] = useState({ nom: '', adresse: '', tel: '', email: '', contact: '', tva: '' });
  const [newIngData, setNewIngData] = useState({ nom: '', famille: 'Frais', fournisseur: '', ref_frn: '', prix: '', unite: 'kg' });
  const [showLogModal, setShowLogModal] = useState(false);
  const [logs, setLogs] = useState([]);

  // --- AUTH & INIT ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchUserProfile(session.user.id);
      else setLoadingAuth(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchUserProfile(session.user.id);
      else { setUserProfile(null); setLoadingAuth(false); }
    });
    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId) => {
      const { data, error } = await supabase.from('user_profiles').select('*, sites(*)').eq('user_id', userId).single();
      if (data) {
          setUserProfile(data);
          if (data.role === 'super_admin' || data.role === 'admin_regie') {
              const { data: allSites } = await supabase.from('sites').select('*').order('nom');
              setAvailableSites(allSites || []);
              if (allSites && allSites.length > 0) setActiveSiteId(allSites[0].id);
          } else {
              setActiveSiteId(data.site_id);
          }
      }
      setLoadingAuth(false);
  };

  useEffect(() => { if (userProfile && activeSiteId) { fetchStock(); fetchRecettes(); fetchHistorique(); fetchSales(); } }, [activeSiteId, userProfile]);

  // --- FETCHERS ---
  async function fetchStock() { const { data } = await supabase.from('ingredients').select('*').eq('site_id', activeSiteId).eq('is_validated', true).order('nom'); if (data) setIngredients(data); const { data: pending } = await supabase.from('ingredients').select('*').eq('site_id', activeSiteId).eq('is_validated', false); if (pending) setPendingIngredients(pending); }
  async function fetchSales() { const { data } = await supabase.from('ventes').select('*').eq('site_id', activeSiteId).order('date_vente', { ascending: false }).limit(500); if (data) setSalesData(data); }
  async function fetchRecettes() { const { data } = await supabase.from('recettes').select('*').eq('site_id', activeSiteId).order('nom_recette'); if (data) setRecettes(data); }
  async function fetchHistorique() { const { data } = await supabase.from('commandes').select('*').eq('site_id', activeSiteId).order('created_at', { ascending: false }); if (data) { setHistoriqueCommandes(data); setCommandesEnAttente(data.filter(c => c.status === 'sent')); const currentMonth = new Date().toLocaleString('fr-FR', { month: 'long', year: 'numeric' }); setExpandedMonths([currentMonth]); } }
  
  const logAction = async (action, details) => { try { await supabase.from('audit_log').insert({ user_email: session.user.email, action, details, site_id: activeSiteId }); } catch (e) { console.log("Log error", e); } };
  const fetchLogs = async () => { const { data } = await supabase.from('audit_log').select('*').eq('site_id', activeSiteId).order('created_at', { ascending: false }).limit(20); if (data) setLogs(data); setShowLogModal(true); };

  const handleLogin = async (e) => { e.preventDefault(); setLoginError(''); const { data, error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPass }); if (error) setLoginError("Erreur : " + error.message); };
  const handleLogout = async () => { await supabase.auth.signOut(); setLoginEmail(''); setLoginPass(''); setActiveSiteId(null); };

  // --- PANIER & COMMANDE ---
  const initCart = () => { const needs = ingredients.filter(i => (i.stock_ideal || 0) > (i.stock_actuel || 0)).map(i => ({ id: i.id, nom: i.nom, unite: i.unite, qte: i.stock_ideal - i.stock_actuel, fournisseur: i.fournisseur, prix: i.prix_achat_moyen })); setCart(needs); setViewCmd('creer'); };
  const updateCartItem = (id, delta) => { setCart(prev => prev.map(item => { if (item.id === id) { return { ...item, qte: Math.max(0, item.qte + delta) }; } return item; })); };
  const removeCartItem = (id) => { setCart(prev => prev.filter(item => item.id !== id)); };
  const addToCart = (ingredient) => { setCart(prev => { const exists = prev.find(item => item.id === ingredient.id); if (exists) return prev; return [...prev, { id: ingredient.id, nom: ingredient.nom, unite: ingredient.unite, qte: 1, fournisseur: ingredient.fournisseur, prix: ingredient.prix_achat_moyen }]; }); setShowAddArticleModal(false); };
  
  const envoyerCommandeFinale = async () => { 
      if (cart.length === 0) return alert("Panier vide !"); 
      if (!confirm(`Envoyer ${cart.length} articles ?`)) return; 
      const frn = [...new Set(cart.map(i => i.fournisseur || 'Autre'))]; 
      for (const f of frn) { 
          const items = cart.filter(i => (i.fournisseur || 'Autre') === f && i.qte > 0); 
          if (items.length === 0) continue; 
          const total = items.reduce((a, i) => a + (i.qte * i.prix), 0); 
          const { data: c } = await supabase.from('commandes').insert({ user_email: session.user.email, fournisseur: f, status: 'pending', total_estime: total, site_id: activeSiteId }).select().single(); 
          if (c) { await supabase.from('commande_lignes').insert(items.map(i => ({ commande_id: c.id, nom_ingredient: i.nom, unite: i.unite, quantite: i.qte, prix_estime: i.prix }))); logAction('Création Commande', `${f} (${items.length} articles)`); } 
      } 
      fetchHistorique(); alert("✅ Commandes envoyées pour validation !"); setCart([]); setViewCmd('historique'); 
  };

  // --- WORKFLOW V61 (VALIDATION / REFUS / ENVOI) ---
  const openRefusalModal = (cmd) => { setCommandToRefuse(cmd); setRefusalReason(''); setShowRefusalModal(true); };
  const confirmRefusal = async () => { if (!refusalReason.trim()) return alert("Motif requis."); await supabase.from('commandes').update({ status: 'refused', refusal_reason: refusalReason }).eq('id', commandToRefuse.id); logAction('Refus', `Cmd ${commandToRefuse.fournisseur} refusée`); fetchHistorique(); setShowRefusalModal(false); setCommandeDetail(null); };
  const validerCommandeRegie = async (cmd) => { if(!confirm("Valider ?")) return; await supabase.from('commandes').update({ status: 'validated' }).eq('id', cmd.id); logAction('Validation', `Cmd ${cmd.fournisseur} validée`); fetchHistorique(); setCommandeDetail(null); };
  const confirmSendToSupplier = async (cmd) => { if(!confirm("Marquer comme envoyé ?")) return; await supabase.from('commandes').update({ status: 'sent' }).eq('id', cmd.id); logAction('Envoi Frn', `Cmd ${cmd.reference_officielle} envoyée`); fetchHistorique(); setCommandeDetail(null); };

  // --- SCAN IA ---
  const handleScanUpload = (e) => { const file = e.target.files[0]; if (file) processScan(file); };
  const processScan = async (file) => { setIsScanning(true); setShowScanModal(true); setScanResults([]); const reader = new FileReader(); reader.onload = async (e) => { const base64Data = e.target.result.split(',')[1]; try { const prompt = `Analyse cette image de bon de livraison. Extrais les articles livrés. Pour chaque article, donne-moi : le nom écrit sur le bon (raw_name), la quantité (qty), l'unité (unit). Renvoie UNIQUEMENT un tableau JSON valide. Exemple: [{"raw_name": "Tomates", "qty": 5, "unit": "kg"}]`; const response = await fetch( `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: file.type, data: base64Data } }] }] }) } ); if (!response.ok) throw new Error("Erreur Gemini"); const data = await response.json(); const text = data.candidates[0].content.parts[0].text; const items = JSON.parse(text.replace(/```json|```/g, '').trim()); const { data: aliases } = await supabase.from('supplier_aliases').select('*').eq('site_id', activeSiteId); const matchedItems = items.map(item => { const known = aliases?.find(a => a.alias_name.toLowerCase() === item.raw_name.toLowerCase()); if (known) { const ing = ingredients.find(i => i.id === known.ingredient_id); if (ing) return { ...item, matchId: ing.id, matchName: ing.nom, status: 'found' }; } const looseMatch = ingredients.find(i => i.nom.toLowerCase().includes(item.raw_name.toLowerCase()) || item.raw_name.toLowerCase().includes(i.nom.toLowerCase())); if (looseMatch) return { ...item, matchId: looseMatch.id, matchName: looseMatch.nom, status: 'guess' }; return { ...item, matchId: '', matchName: '', status: 'unknown' }; }); setScanResults(matchedItems); } catch (err) { alert("Erreur: " + err.message); setShowScanModal(false); } finally { setIsScanning(false); } }; reader.readAsDataURL(file); };
  const updateScanMatch = (index, ingId) => { const newResults = [...scanResults]; const ing = ingredients.find(i => i.id === parseInt(ingId)); newResults[index].matchId = ingId; newResults[index].matchName = ing ? ing.nom : ''; newResults[index].status = ingId ? 'manual' : 'unknown'; setScanResults(newResults); };
  const validateScan = async () => { if (!confirm("Valider ?")) return; let count = 0; for (const item of scanResults) { if (item.matchId) { const ing = ingredients.find(i => i.id === parseInt(item.matchId)); if (ing) { await supabase.from('ingredients').update({ stock_actuel: (ing.stock_actuel || 0) + parseFloat(item.qty) }).eq('id', ing.id); const { data: existing } = await supabase.from('supplier_aliases').select('id').eq('alias_name', item.raw_name).eq('site_id', activeSiteId).single(); if (!existing) { await supabase.from('supplier_aliases').insert({ site_id: activeSiteId, ingredient_id: ing.id, alias_name: item.raw_name }); } count++; } } } alert(`✅ ${count} OK !`); fetchStock(); setShowScanModal(false); };

  // --- AUTRES FONCTIONS ---
  const findFamilyOfRecipe = (subFamily) => { for (const [famille, sousFamilles] of Object.entries(RECETTE_STRUCTURE)) { if (sousFamilles.includes(subFamily)) return famille; } return 'Petite Restauration'; };
  const creerRecette = async () => { if (!newRecetteName) return; const { data } = await supabase.from('recettes').insert({ nom_recette: newRecetteName, categorie: newRecetteSousFamille, site_id: activeSiteId }).select().single(); if (data) { setRecettes([...recettes, data]); setIsCreatingRecette(false); setNewRecetteName(''); setNewRecetteFamille('Petite Restauration'); setNewRecetteSousFamille(RECETTE_STRUCTURE['Petite Restauration'][0]); const { data: details } = await supabase.from('recette_ingredients').select('*, ingredients(*)').eq('recette_id', data.id); setRecetteDetails(details || []); setSelectedRecette(data); } };
  const getFilteredRecettes = () => { let filtered = recettes; if (filterRecetteFamily !== 'Toutes') { const allowedSubFamilies = RECETTE_STRUCTURE[filterRecetteFamily] || []; filtered = recettes.filter(r => allowedSubFamilies.includes(r.categorie)); } return filtered.sort((a, b) => a.nom_recette.localeCompare(b.nom_recette)); };
  const updateRecetteCategoryAdmin = async () => { if (!selectedRecette || !editRecetteSubFam) return; await supabase.from('recettes').update({ categorie: editRecetteSubFam }).eq('id', selectedRecette.id); setSelectedRecette({ ...selectedRecette, categorie: editRecetteSubFam }); setRecettes(recettes.map(r => r.id === selectedRecette.id ? { ...r, categorie: editRecetteSubFam } : r)); logAction('Correction Recette', `${selectedRecette.nom_recette} -> ${editRecetteSubFam}`); alert("✅ Catégorie mise à jour !"); };
  const getSelectedIngredientUnit = () => { if (!ajoutIngredientRecette) return ''; const ing = ingredients.find(i => i.id === parseInt(ajoutIngredientRecette)); return ing ? ing.unite : ''; };
  const validerIngredientAdmin = async (id, valide) => { if (valide) { await supabase.from('ingredients').update({ is_validated: true }).eq('id', id); logAction('Validation Article', `ID: ${id}`); } else { if(confirm("Supprimer ?")) await supabase.from('ingredients').delete().eq('id', id); } fetchStock(); };
  const validerPerte = async () => { if (!perteData.id || !perteData.qte) return; const ing = ingredients.find(i => i.id === parseInt(perteData.id)); if (!ing) return; const valeurPerdue = ing.prix_achat_moyen * parseFloat(perteData.qte); await supabase.from('ingredients').update({ stock_actuel: (ing.stock_actuel || 0) - parseFloat(perteData.qte) }).eq('id', ing.id); await supabase.from('mouvements_stock').insert({ ingredient_id: ing.id, type_mouvement: 'Perte', quantite: parseFloat(perteData.qte), motif: `${perteData.motif}`, valeur_perte: valeurPerdue, site_id: activeSiteId }); logAction('Perte', `${ing.nom}: -${perteData.qte} (${perteData.motif})`); alert(`🗑️ Perte enregistrée !`); setShowPerteModal(false); setPerteData({ id: '', qte: '', motif: 'Périmé', comment: '' }); fetchStock(); };
  const validerTransformation = async () => { if (!transfoData.srcId || !transfoData.srcQte || !transfoData.destId || !transfoData.destQte) return; const srcIng = ingredients.find(i => i.id === parseInt(transfoData.srcId)); const destIng = ingredients.find(i => i.id === parseInt(transfoData.destId)); if (!srcIng || !destIng) return; await supabase.from('ingredients').update({ stock_actuel: (srcIng.stock_actuel || 0) - parseFloat(transfoData.srcQte) }).eq('id', srcIng.id); await supabase.from('ingredients').update({ stock_actuel: (destIng.stock_actuel || 0) + parseFloat(transfoData.destQte) }).eq('id', destIng.id); await supabase.from('mouvements_stock').insert({ ingredient_id: srcIng.id, type_mouvement: 'Transformation Sortie', quantite: parseFloat(transfoData.srcQte), motif: `Transformé en ${destIng.nom}`, site_id: activeSiteId }); logAction('Transformation', `${srcIng.nom} -> ${destIng.nom}`); alert(`♻️ Transformation validée !`); setShowTransfoModal(false); setTransfoData({ srcId: '', srcQte: '', destId: '', destQte: '' }); fetchStock(); };
  const demanderCreationFournisseur = () => { alert(`📤 Demande envoyée à l'administrateur pour : ${newFournData.nom}`); setShowCreateFournisseur(false); setNewFournData({ nom: '', adresse: '', tel: '', email: '', contact: '', tva: '' }); };
  const demanderCreationIngredient = async () => { if (!newIngData.nom || !newIngData.prix) return alert("Nom et Prix obligatoires"); const { error } = await supabase.from('ingredients').insert({ nom: newIngData.nom, famille: newIngData.famille, fournisseur: newIngData.fournisseur, unite: newIngData.unite, prix_achat_moyen: newIngData.prix, stock_actuel: 0, is_validated: false, site_id: activeSiteId }); if (!error) { alert("⏳ Demande envoyée !"); setShowCreateIngredient(false); fetchStock(); } };
  const handleSalesImport = async (e) => { if(!confirm("Ceci est une démo. Voulez-vous générer des ventes aléatoires ?")) return; const fakeSales = []; const today = new Date(); for(let i=0; i<20; i++) { const fam = FAMILLES_VENTES[Math.floor(Math.random() * FAMILLES_VENTES.length)]; fakeSales.push({ date_vente: new Date(today.getFullYear(), today.getMonth(), Math.floor(Math.random()*28)+1).toISOString(), famille: fam, article: `Article Test ${i}`, quantite: Math.floor(Math.random() * 5) + 1, prix_total: (Math.random() * 20).toFixed(2), site_id: activeSiteId }); } const { error } = await supabase.from('ventes').insert(fakeSales); if(error) alert("Erreur: "+error.message); else { alert("✅ Ventes importées !"); fetchSales(); } };
  const triggerSalesInput = () => document.getElementById('salesInput').click();
  const getFilteredSales = () => { const now = new Date(); let startDate = new Date(0); if (salesPeriod === 'day') { startDate = new Date(); startDate.setHours(0,0,0,0); } if (salesPeriod === 'week') { startDate = new Date(); startDate.setDate(now.getDate() - 7); } if (salesPeriod === 'month') { startDate = new Date(now.getFullYear(), now.getMonth(), 1); } return salesData.filter(s => { const sDate = new Date(s.date_vente); const matchDate = sDate >= startDate; const matchFam = salesFilterFam === 'Tout' || s.famille === salesFilterFam; return matchDate && matchFam; }); };
  const calculateTotalSales = (data) => data.reduce((acc, curr) => acc + parseFloat(curr.prix_total || 0), 0);
  const handleExportInventory = async () => { const workbook = new ExcelJS.Workbook(); const sheet = workbook.addWorksheet('Inventaire'); sheet.addRow(['Famille', 'Article', 'Unité', 'Quantité', 'Prix Unitaire', 'Valeur Totale']); const source = inventoryData.length > 0 ? inventoryData : ingredients; source.forEach(i => { const qty = i.stock_physique !== undefined ? i.stock_physique : i.stock_actuel; sheet.addRow([ i.famille, `${i.nom} (${i.unite})`, i.unite, qty, i.prix_achat_moyen, (qty * i.prix_achat_moyen) ]); }); const buffer = await workbook.xlsx.writeBuffer(); saveAs(new Blob([buffer]), `Inventaire_${new Date().toLocaleDateString().replace(/\//g,'-')}.xlsx`); };
  const handleTemplateUpload = async (e, cmd) => { const file = e.target.files[0]; if (!file) return; setIsProcessingExcel(true); try { const COL_REFERENCE = 1; const COL_DESCRIPTION = 2; const COL_QUANTITE = 5; let refOfficielle = cmd.reference_officielle; if (!refOfficielle) { const dateNow = new Date(); const anneeShort = dateNow.getFullYear().toString().substr(-2); const { data: lastCmds } = await supabase.from('commandes').select('reference_officielle').ilike('reference_officielle', `%-${anneeShort}%`).neq('reference_officielle', null).order('reference_officielle', {ascending:false}).limit(1); let sequenceInt = 1; if (lastCmds && lastCmds.length > 0 && lastCmds[0].reference_officielle) { const match = lastCmds[0].reference_officielle.match(/(\d+)$/); if (match) { const fullSequence = match[1]; const seqOnly = fullSequence.substring(2); const parsed = parseInt(seqOnly); if (!isNaN(parsed)) sequenceInt = parsed + 1; } } const sequence = sequenceInt.toString().padStart(3, '0'); refOfficielle = `R708.01-226-${anneeShort}${sequence}`; await supabase.from('commandes').update({ status: 'validated', reference_officielle: refOfficielle }).eq('id', cmd.id); logAction('Validation Commande', `Ref: ${refOfficielle} (${cmd.fournisseur})`); } const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(await file.arrayBuffer()); const worksheet = workbook.worksheets[0]; worksheet.getCell('G4').value = refOfficielle; worksheet.getCell('F7').value = new Date().toLocaleDateString(); worksheet.getCell('D9').value = cmd.fournisseur.toUpperCase(); const { data: lignes } = await supabase.from('commande_lignes').select('*').eq('commande_id', cmd.id); const { data: stockRef } = await supabase.from('ingredients').select('nom, reference_fournisseur, unite'); let startRow = 23; worksheet.eachRow((row, rowNumber) => { row.eachCell((cell) => { if (cell.value && typeof cell.value === 'string' && cell.value.toString().toUpperCase().includes('DESCRIPTION')) startRow = rowNumber + 1; }); }); lignes.forEach((l, index) => { const row = worksheet.getRow(startRow + index); const info = stockRef?.find(i => i.nom === l.nom_ingredient); row.getCell(COL_REFERENCE).value = info?.reference_fournisseur || ""; row.getCell(COL_DESCRIPTION).value = `${l.nom_ingredient} (${l.unite})`; row.getCell(COL_QUANTITE).value = Number(l.quantite); row.commit(); }); const buffer = await workbook.xlsx.writeBuffer(); saveAs(new Blob([buffer]), `BC_${refOfficielle}_${cmd.fournisseur}.xlsx`); fetchHistorique(); setCommandeDetail(null); alert(`✅ Fichier généré : ${refOfficielle}`); } catch (err) { alert(`ERREUR : ${err.message}`); } finally { setIsProcessingExcel(false); } };
  const validerEtUpload = () => document.getElementById('templateInput').click();
  const calculerPrixRevientRecette = () => { if (!recetteDetails) return 0; return recetteDetails.reduce((total, item) => total + ((item.ingredients?.prix_achat_moyen || 0) * item.quantite_requise), 0); };
  const getMargeApplicable = (categorie) => { const grandeFamille = findFamilyOfRecipe(categorie); return MARGES_FINANCIERES[grandeFamille] || 0; };
  const ajouterIngredientAuPlat = async () => { if (!selectedRecette || !ajoutIngredientRecette || !qteAjoutRecette) return; const ing = ingredients.find(i => i.id === parseInt(ajoutIngredientRecette)); const { error } = await supabase.from('recette_ingredients').insert({ recette_id: selectedRecette.id, ingredient_id: ing.id, quantite_requise: parseFloat(qteAjoutRecette), unite_recette: ing.unite }); if (!error) { const { data } = await supabase.from('recette_ingredients').select('*, ingredients(*)').eq('recette_id', selectedRecette.id); setRecetteDetails(data || []); setAjoutIngredientRecette(''); setQteAjoutRecette(''); } };
  const supprimerIngredientRecette = async (idLigne) => { await supabase.from('recette_ingredients').delete().eq('id', idLigne); setRecetteDetails(recetteDetails.filter(r => r.id !== idLigne)); };
  const getFilteredIngredients = () => { return ingredients.filter(i => { const matchFamille = filtreFamille === 'Tout' || (i.famille || 'Divers') === filtreFamille; const matchFourn = filtreFournisseur === 'Tous' || (i.fournisseur || 'Autre') === filtreFournisseur; return matchFamille && matchFourn; }); };
  const startInventory = () => { setInventoryData(ingredients.map(i => ({ ...i, stock_physique: i.stock_actuel }))); setInventoryMode('input'); };
  const updateInventoryLine = (id, val) => { setInventoryData(inventoryData.map(i => i.id === id ? { ...i, stock_physique: parseFloat(val) } : i)); };
  const validerInventaire = async () => { if(!confirm("Valider l'inventaire ?")) return; let totalValue = 0; for (const item of inventoryData) { await supabase.from('ingredients').update({ stock_actuel: item.stock_physique }).eq('id', item.id); totalValue += (item.stock_physique * item.prix_achat_moyen); } logAction('Inventaire Validé', `Valeur: ${totalValue.toFixed(2)}€`); fetchStock(); setInventoryData([]); setInventoryMode('view'); alert(`✅ Inventaire validé !`); };
  const handleManualScan = (e) => { e.preventDefault(); const code = manualBarcode.trim(); if (!code) return; const found = inventoryData.find(i => i.code_barre === code); if (found) { const qte = prompt(`✅ TROUVÉ : ${found.nom}\nStock actuel : ${found.stock_physique} ${found.unite}\n\nNouvelle quantité ?`); if (qte !== null) { setInventoryData(inventoryData.map(i => i.id === found.id ? { ...i, stock_physique: parseFloat(qte) } : i)); setManualBarcode(''); } } else { alert(`❌ Code inconnu.`); setManualBarcode(''); } };
  const demarrerReception = async (cmd) => { if (!cmd || !cmd.id) return; const { data: lignes } = await supabase.from('commande_lignes').select('*').eq('commande_id', cmd.id); const lignesControle = lignes.map(l => ({ ...l, qte_recue: l.quantite, statut_ligne: 'ok' })); setReceptionEnCours({ info: cmd, lignes: lignesControle }); setModeReception('commande'); };
  const updateLigneReception = (index, field, val) => { if (!receptionEnCours) return; const newLignes = [...receptionEnCours.lignes]; newLignes[index][field] = val; if (field === 'qte_recue') { if (parseFloat(val) < newLignes[index].quantite) { if(newLignes[index].statut_ligne === 'ok') newLignes[index].statut_ligne = 'rupture'; } else { newLignes[index].statut_ligne = 'ok'; } } setReceptionEnCours({ ...receptionEnCours, lignes: newLignes }); };
  const validerReceptionFinale = async () => { if(!confirm("Confirmer ?")) return; const itemsLitige = receptionEnCours.lignes.filter(l => l.statut_ligne === 'litige'); const hasLitige = itemsLitige.length > 0; for (const item of receptionEnCours.lignes) { if (item.qte_recue > 0) { const { data: ing } = await supabase.from('ingredients').select('stock_actuel, id').eq('nom', item.nom_ingredient).single(); if (ing) { await supabase.from('ingredients').update({ stock_actuel: ing.stock_actuel + parseFloat(item.qte_recue) }).eq('id', ing.id); } } await supabase.from('commande_lignes').update({ qte_recue: item.qte_recue, statut_ligne: item.statut_ligne }).eq('id', item.id); } await supabase.from('commandes').update({ status: 'received', date_reception: new Date(), has_litige: hasLitige }).eq('id', receptionEnCours.info.id); if (hasLitige) { alert("🚨 ANOMALIE : Mail généré !"); } else { alert("✅ Stock mis à jour !"); } setReceptionEnCours(null); setModeReception('choix'); fetchHistorique(); fetchStock(); };
  const saveIngredientDetails = async () => { if(!editingIngredient) return; await supabase.from('ingredients').update({ reference_fournisseur: editingIngredient.reference_fournisseur, code_barre: editingIngredient.code_barre, fournisseur: editingIngredient.fournisseur, unite: editingIngredient.unite, stock_ideal: editingIngredient.stock_ideal, allergenes: editingIngredient.allergenes, famille: editingIngredient.famille, prix_achat_moyen: editingIngredient.prix_achat_moyen }).eq('id', editingIngredient.id); setIngredients(ingredients.map(i => i.id === editingIngredient.id ? editingIngredient : i)); setEditingIngredient(null); };
  const toggleAllergen = (alg) => { const current = editingIngredient.allergenes || []; setEditingIngredient({...editingIngredient, allergenes: current.includes(alg) ? current.filter(a => a !== alg) : [...current, alg]}); };
  const getRecetteAllergenes = () => { const allAlg = new Set(); recetteDetails.forEach(item => { if(item.ingredients.allergenes) item.ingredients.allergenes.forEach(a => allAlg.add(a)); }); return Array.from(allAlg); };
  const askGeminiIdeas = async () => { setAiLoading(true); setShowAiModal(true); const restes = ingredients.filter(i => i.stock_actuel > 0).map(i => `${i.stock_actuel} ${i.unite} de ${i.nom}`).join(', '); const prompt = `Agis comme un chef de cuisine collective. Voici mon stock : ${restes || "rien de spécial"}. Propose 3 idées de recettes anti-gaspi simples.`; try { const modelName = 'gemini-pro'; const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) }); if (!response.ok) { const errorData = await response.json(); throw new Error(`Erreur ${response.status}: ${errorData.error?.message || "Inconnue"}`); } const data = await response.json(); setAiResponse(data.candidates[0].content.parts[0].text); } catch (error) { setAiResponse("⚠️ L'IA n'est pas disponible.\n" + error.message); } finally { setAiLoading(false); } };
  const ajouterAuBon = () => { if (!selectedIng || !qteLivraison) return; const ingInfo = ingredients.find(i => i.id === parseInt(selectedIng)); setPanierLivraison([...panierLivraison, { id: ingInfo.id, nom: ingInfo.nom, unite: ingInfo.unite, qte: parseFloat(qteLivraison), nouveauPrix: (userProfile.role === 'cuisine' || !prixLivraison) ? ingInfo.prix_achat_moyen : parseFloat(prixLivraison) }]); setQteLivraison(''); setPrixLivraison(''); setSelectedIng(''); };
  const validerLivraisonLibre = async () => { if (!confirm(`Valider l'entrée ?`)) return; for (const item of panierLivraison) { const { data: current } = await supabase.from('ingredients').select('stock_actuel').eq('id', item.id).single(); if (current) { const updateData = { stock_actuel: (current.stock_actuel || 0) + item.qte }; if (userProfile.role !== 'cuisine') updateData.prix_achat_moyen = item.nouveauPrix; await supabase.from('ingredients').update(updateData).eq('id', item.id); } } setPanierLivraison([]); fetchStock(); alert("✅ Stock mis à jour !"); };
  const voirDetail = async (cmd) => { const { data } = await supabase.from('commande_lignes').select('*').eq('commande_id', cmd.id); setCommandeDetail({ Info: cmd, Lignes: data }); };
  const groupCommandsByMonth = (cmds) => { const groups = {}; const filtered = cmds.filter(c => historyFilterFrn === 'Tous' || c.fournisseur === historyFilterFrn); filtered.forEach(cmd => { const date = new Date(cmd.created_at); const key = date.toLocaleString('fr-FR', { month: 'long', year: 'numeric' }); if (!groups[key]) groups[key] = []; groups[key].push(cmd); }); return groups; };
  const toggleMonth = (month) => { if (expandedMonths.includes(month)) setExpandedMonths(expandedMonths.filter(m => m !== month)); else setExpandedMonths([...expandedMonths, month]); };
  const getStatusBadge = (status) => { switch(status) { 
      case 'pending': return { color: 'bg-orange-100 text-orange-600', label: 'En attente Validation', icon: <Clock size={14}/> }; 
      case 'validated': return { color: 'bg-blue-100 text-blue-600', label: 'Validé - À envoyer', icon: <CheckSquare size={14}/> }; 
      case 'sent': return { color: 'bg-green-100 text-green-600', label: 'Envoyé Frn.', icon: <Send size={14}/> }; 
      case 'received': return { color: 'bg-slate-100 text-slate-500', label: 'Reçu / Clôturé', icon: <ArchiveIcon size={14}/> }; 
      case 'refused': return { color: 'bg-red-100 text-red-600', label: 'Refusé', icon: <Ban size={14}/> }; 
      default: return { color: 'bg-slate-100', label: status, icon: null }; 
  } };
  const ArchiveIcon = ({size}) => <div className={`w-[${size}px] h-[${size}px] border-2 border-slate-400 rounded-sm`}></div>;

  if (loadingAuth) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white text-xl font-bold animate-pulse">Chargement de RPOMB...</div>;

  if (!session || !userProfile) return <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans"><div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-sm text-center"><h1 className="text-3xl font-black text-slate-800 mb-6">RPOMB<span className="text-blue-600">.app</span></h1><form onSubmit={handleLogin} className="space-y-4"><input type="email" placeholder="Email" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" value={loginEmail} onChange={e=>setLoginEmail(e.target.value)}/><input type="password" placeholder="Mot de passe" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" value={loginPass} onChange={e=>setLoginPass(e.target.value)}/><button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-bold transition-all shadow-lg shadow-blue-200">CONNEXION</button>{loginError && <p className="text-red-500 text-sm mt-2">{loginError}</p>}</form></div></div>;return (
    <div className="max-w-md mx-auto bg-slate-50 min-h-screen pb-24 font-sans text-slate-800">
      <div className="bg-white p-4 shadow-sm sticky top-0 z-20 flex flex-col gap-2 border-b border-slate-100">
          <div className="flex justify-between items-center">
              <div className="flex items-center gap-2"><div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black">R</div><h1 className="font-bold text-lg text-slate-700">RPOMB <span className="text-xs font-normal bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">v61 Workflow</span></h1></div>
              <div className="flex items-center gap-3"><span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-full uppercase">{userProfile.role.replace('_', ' ')}</span>{userProfile.role === 'super_admin' && <Crown size={16} className="text-amber-500"/>}<button onClick={handleLogout} className="text-slate-400 hover:text-red-500"><LogOut size={20}/></button></div>
          </div>
          
          {(userProfile.role === 'super_admin' || userProfile.role === 'admin_regie') && availableSites.length > 0 && (
              <div className="relative">
                  <MapPin size={16} className="absolute left-3 top-3 text-slate-400"/>
                  <select className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 appearance-none" value={activeSiteId || ''} onChange={(e) => setActiveSiteId(e.target.value)}>
                      {availableSites.map(s => (<option key={s.id} value={s.id}>{s.nom}</option>))}
                  </select>
                  <ChevronDown size={16} className="absolute right-3 top-3 text-slate-400 pointer-events-none"/>
              </div>
          )}
          {!(userProfile.role === 'super_admin' || userProfile.role === 'admin_regie') && userProfile.sites && (
              <div className="flex items-center gap-2 text-xs text-slate-500 px-1"><MapPin size={12}/> {userProfile.sites.nom}</div>
          )}
      </div>
      
      <div className="p-4">
        {/* ALERTE ADMIN */}
        {(userProfile.role === 'super_admin' || userProfile.role === 'admin_regie') && pendingIngredients.length > 0 && (
            <div className="mb-6 animate-in slide-in-from-top">
                <div className="bg-amber-100 border-l-4 border-amber-500 p-4 rounded-r-xl shadow-sm">
                    <h3 className="font-bold text-amber-900 flex items-center gap-2"><ShieldAlert/> Validations ({pendingIngredients.length})</h3>
                    <div className="mt-3 space-y-2">{pendingIngredients.map(ing => (<div key={ing.id} className="bg-white p-3 rounded-lg flex justify-between items-center text-sm shadow-sm"><div><div className="font-bold">{ing.nom}</div><div className="text-xs text-slate-500">{ing.fournisseur}</div></div><div className="flex gap-2"><button onClick={()=>validerIngredientAdmin(ing.id, false)} className="p-2 bg-red-50 text-red-600 rounded"><X size={16}/></button><button onClick={()=>validerIngredientAdmin(ing.id, true)} className="p-2 bg-green-50 text-green-600 rounded"><CheckSquare size={16}/></button></div></div>))}</div>
                </div>
            </div>
        )}

        {/* DASHBOARD */}
        {activeTab === 'commandes' && viewCmd === 'menu' && !commandeDetail && (
            <div className="space-y-6">
                <h2 className="text-2xl font-black mb-6 text-slate-800 flex items-center gap-2"><ShoppingBag className="text-blue-600"/> Dashboard</h2>
                <button onClick={askGeminiIdeas} className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-4 rounded-2xl shadow-lg shadow-purple-200 flex items-center justify-between group hover:scale-[1.02] transition-transform"><div className="flex items-center gap-3"><div className="bg-white/20 p-2 rounded-lg"><Sparkles className="text-white"/></div><div className="text-left"><div className="font-bold text-lg">SOS Idées Recettes</div><div className="text-xs text-purple-100 opacity-80">Générer un menu avec le stock</div></div></div><ChevronLeft className="rotate-180 opacity-50 group-hover:opacity-100"/></button>

                <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => { initCart(); }} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center gap-3 hover:border-blue-500 hover:shadow-md transition-all"><div className="bg-blue-50 p-4 rounded-full"><ShoppingBag size={32} className="text-blue-600"/></div><span className="font-bold text-slate-700">Nouvelle Cmd</span></button>
                    <button onClick={() => setViewCmd('historique')} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center gap-3 hover:border-blue-500 hover:shadow-md transition-all"><div className="bg-amber-50 p-4 rounded-full"><FileText size={32} className="text-amber-600"/></div><span className="font-bold text-slate-700">Historique</span></button>
                    
                    {(userProfile.role === 'super_admin' || userProfile.role === 'admin_regie') && (
                        <button onClick={() => { setViewCmd('historique'); }} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center gap-2 relative col-span-2">
                            {historiqueCommandes.filter(c => c.status === 'pending').length > 0 && <div className="absolute top-3 right-3 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-md animate-bounce">{historiqueCommandes.filter(c => c.status === 'pending').length}</div>}
                            <ShieldAlert size={24} className="text-red-500"/>
                            <span className="text-xs font-bold text-slate-500 text-center uppercase tracking-wider">Commandes à Valider</span>
                        </button>
                    )}

                    {userProfile.role === 'cuisine' && (
                        <>
                        <button onClick={() => { setViewCmd('historique'); }} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center gap-2 relative">
                            {historiqueCommandes.filter(c => c.status === 'validated').length > 0 && <div className="absolute top-3 right-3 bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-md animate-pulse">{historiqueCommandes.filter(c => c.status === 'validated').length}</div>}
                            <CheckSquare size={24} className="text-blue-500"/>
                            <span className="text-xs font-bold text-slate-500 text-center">À envoyer</span>
                        </button>
                        <button onClick={goToReception} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center gap-2 relative">
                            {historiqueCommandes.filter(c => c.status === 'sent').length > 0 && <div className="absolute top-3 right-3 bg-green-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-md">{historiqueCommandes.filter(c => c.status === 'sent').length}</div>}
                            <Truck size={24} className="text-green-500"/>
                            <span className="text-xs font-bold text-slate-500 text-center">À Recevoir</span>
                        </button>
                        </>
                    )}

                    {userProfile.role !== 'cuisine' && (
                        <>
                        <button onClick={() => setViewCmd('stocks')} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center gap-3 hover:border-blue-500 hover:shadow-md transition-all"><div className="bg-slate-50 p-4 rounded-full"><Settings size={32} className="text-slate-600"/></div><span className="font-bold text-slate-700">Base Articles</span></button>
                        <button onClick={() => setViewCmd('ventes')} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center gap-3 hover:border-blue-500 hover:shadow-md transition-all"><div className="bg-green-50 p-4 rounded-full"><Banknote size={32} className="text-green-600"/></div><span className="font-bold text-slate-700">Finance & Ventes</span></button>
                        <button onClick={fetchLogs} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center gap-3 col-span-2"><Activity size={24} className="text-slate-400"/><span className="text-xs font-bold text-slate-500">Journal d'Activité</span></button>
                        </>
                    )}
                </div>
            </div>
        )}

        {/* VUE IMPORT VENTES */}
        {viewCmd === 'ventes' && ( <div className="animate-in slide-in-from-right duration-200"><div className="flex items-center gap-3 mb-4"><button onClick={() => setViewCmd('menu')} className="bg-white border border-slate-200 p-2 rounded-xl text-slate-500 hover:bg-slate-50"><ChevronLeft/></button><h3 className="font-bold text-lg">Import Ventes</h3></div><div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-6 flex justify-between items-center"><div><h4 className="font-bold text-slate-700">Importer Ventes</h4><p className="text-xs text-slate-400">Excel / CSV de la caisse</p></div><input type="file" id="salesInput" style={{display:'none'}} accept=".xlsx,.csv" onChange={handleSalesImport}/><button onClick={triggerSalesInput} className="bg-green-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2"><Upload size={16}/> Importer</button></div><div className="space-y-4 pb-20"><div className="flex gap-2 bg-slate-100 p-1 rounded-xl mb-4">{['day', 'week', 'month'].map(p => (<button key={p} onClick={()=>setSalesPeriod(p)} className={`flex-1 py-1 rounded-lg text-xs font-bold capitalize ${salesPeriod===p?'bg-white shadow text-slate-800':'text-slate-400'}`}>{p === 'day' ? 'Auj.' : p === 'week' ? 'Semaine' : 'Mois'}</button>))}</div><div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 rounded-2xl text-white shadow-lg mb-6"><div className="text-sm opacity-80 mb-1">Chiffre d'Affaires ({salesPeriod === 'day' ? 'Aujourd\'hui' : salesPeriod === 'week' ? 'Cette Semaine' : 'Ce Mois'})</div><div className="text-4xl font-black">{calculateTotalSales(getFilteredSales()).toFixed(2)} €</div></div><div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">{['Tout', ...FAMILLES_VENTES].map(f => (<button key={f} onClick={() => setSalesFilterFam(f)} className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all ${salesFilterFam === f ? 'bg-slate-800 text-white' : 'bg-white text-slate-500 border border-slate-200'}`}>{f}</button>))}</div><div className="bg-white rounded-2xl border border-slate-100 overflow-hidden"><div className="p-3 bg-slate-50 border-b border-slate-100 font-bold text-slate-400 text-[10px] uppercase flex tracking-wider"><span className="w-1/2">Produit</span><span className="w-1/4 text-center">Qté</span><span className="w-1/4 text-right">Total</span></div><div className="divide-y divide-slate-50 max-h-[50vh] overflow-y-auto">{getFilteredSales().length === 0 ? (<div className="p-8 text-center text-slate-400 text-sm">Aucune vente sur cette période.</div>) : (getFilteredSales().map((s, idx) => (<div key={idx} className="flex justify-between items-center p-3 text-sm"><div className="w-1/2"><div className="font-bold text-slate-700">{s.article}</div><div className="text-[10px] text-slate-400">{new Date(s.date_vente).toLocaleDateString()} • {s.famille}</div></div><div className="w-1/4 text-center font-bold text-slate-500">{s.quantite}</div><div className="w-1/4 text-right font-black text-green-600">{s.prix_total}€</div></div>)))}</div></div></div></div> )}

        {/* VUE CREER COMMANDE (V41) */}
        {viewCmd === 'creer' && !commandeDetail && (
            <div className="animate-in slide-in-from-right duration-200">
                <div className="flex items-center gap-3 mb-4">
                    <button onClick={() => setViewCmd('menu')} className="bg-white border border-slate-200 p-2 rounded-xl text-slate-500 hover:bg-slate-50"><ChevronLeft/></button>
                    <div className="flex-1 flex justify-between items-center">
                        <h3 className="font-bold text-lg">Mon Panier ({cart.length})</h3>
                        <button onClick={()=>setShowAddArticleModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg"><Plus size={18}/> Ajouter Article</button>
                    </div>
                </div>
                <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 mb-4 overflow-x-auto whitespace-nowrap scrollbar-hide flex gap-2">{['Tous', 'Solucious', 'Bidfood', 'Pochet', 'Autre'].map(f => (<button key={f} onClick={() => setFiltreFournisseur(f)} className={`px-3 py-1 rounded-lg text-[10px] font-bold border transition-all ${filtreFournisseur === f ? 'border-blue-600 text-blue-600 bg-blue-50' : 'border-slate-200 text-slate-400'}`}>{f}</button>))}</div>
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden pb-20">{cart.filter(i => filtreFournisseur === 'Tous' || i.fournisseur === filtreFournisseur).length === 0 ? <div className="p-10 text-center text-slate-400"><p>Panier vide pour ce fournisseur.</p></div> : cart.filter(i => filtreFournisseur === 'Tous' || i.fournisseur === filtreFournisseur).map(i => (<div key={i.id} className="flex justify-between items-center p-4 border-b border-slate-50 last:border-0"><div className="flex-1"><div className="font-bold text-slate-700">{i.nom} <span className="text-xs font-normal text-slate-400">({i.unite})</span></div><div className="text-[10px] font-bold text-slate-400 bg-slate-50 inline-block px-2 rounded mt-1">{i.fournisseur}</div></div><div className="flex items-center gap-3"><button onClick={()=>updateCartItem(i.id, -1)} className="w-8 h-8 flex items-center justify-center bg-slate-100 rounded-lg text-slate-500 font-bold">-</button><div className="font-black text-blue-600 w-12 text-center">{i.qte.toFixed(2)}</div><button onClick={()=>updateCartItem(i.id, 1)} className="w-8 h-8 flex items-center justify-center bg-slate-100 rounded-lg text-slate-500 font-bold">+</button><button onClick={()=>removeCartItem(i.id)} className="text-red-300 hover:text-red-500 ml-2"><Trash2 size={18}/></button></div></div>))}</div>
                {cart.length > 0 && <div className="fixed bottom-24 left-4 right-4"><button onClick={envoyerCommandeFinale} className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold shadow-xl shadow-blue-200 flex justify-center gap-2 items-center hover:bg-blue-700 transition-all"><Send size={20}/> ENVOYER ({cart.length})</button></div>}
            </div>
        )}

        {/* MODAL AJOUT ARTICLE MANUEL */}
        {showAddArticleModal && ( <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"><div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm max-h-[80vh] flex flex-col"><div className="p-4 border-b flex justify-between items-center bg-slate-50 rounded-t-2xl"><h3 className="font-black text-lg">Ajouter au panier</h3><button onClick={()=>setShowAddArticleModal(false)}><X/></button></div><div className="p-4"><input autoFocus placeholder="Rechercher..." className="w-full border p-3 rounded-xl bg-slate-50 font-bold" onChange={e => setManualBarcode(e.target.value.toLowerCase())}/></div><div className="overflow-y-auto flex-1 p-2">{ingredients.filter(i => i.nom.toLowerCase().includes(manualBarcode)).map(i => (<button key={i.id} onClick={()=>addToCart(i)} className="w-full text-left p-3 hover:bg-slate-50 rounded-xl border-b border-slate-50 flex justify-between items-center"><div><span className="font-bold block">{i.nom}</span><span className="text-[10px] text-slate-400 font-bold">Unité : {i.unite}</span></div><span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded border border-slate-200">{i.fournisseur}</span></button>))}</div></div></div> )}

        {/* VUE HISTORIQUE */}
        {viewCmd === 'historique' && !commandeDetail && (
            <div className="animate-in slide-in-from-right duration-200">
                <div className="flex items-center gap-3 mb-4"><button onClick={() => setViewCmd('menu')} className="bg-white border border-slate-200 p-2 rounded-xl text-slate-500 hover:bg-slate-50"><ChevronLeft/></button><h3 className="font-bold text-lg">Historique</h3></div>
                <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 mb-4 overflow-x-auto whitespace-nowrap scrollbar-hide flex gap-2 items-center"><Filter size={16} className="text-slate-400 mr-2"/>{['Tous', 'Solucious', 'Bidfood', 'Pochet', 'Autre'].map(f => (<button key={f} onClick={() => setHistoryFilterFrn(f)} className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${historyFilterFrn === f ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500'}`}>{f}</button>))}</div>
                <div className="space-y-4 pb-20">{Object.entries(groupCommandsByMonth(historiqueCommandes)).map(([month, cmds]) => (<div key={month} className="bg-white rounded-2xl border border-slate-100 overflow-hidden"><button onClick={() => toggleMonth(month)} className="w-full p-4 flex justify-between items-center bg-slate-50 hover:bg-slate-100 transition-colors"><div className="font-black text-slate-700">{month}</div><div className="flex items-center gap-2"><span className="text-xs bg-white px-2 py-1 rounded-full border border-slate-200 font-bold text-slate-400">{cmds.length} cmds</span>{expandedMonths.includes(month) ? <ChevronDown size={18} className="text-slate-400"/> : <ChevronRight size={18} className="text-slate-400"/>}</div></button>{expandedMonths.includes(month) && (<div className="divide-y divide-slate-50">{cmds.map(c => { const statusStyle = getStatusBadge(c.status); return ( <div key={c.id} onClick={() => voirDetail(c)} className="p-4 cursor-pointer hover:bg-slate-50 transition-colors flex justify-between items-center group"><div className="flex items-center gap-3"><div className={`w-8 h-8 rounded-full flex items-center justify-center ${statusStyle.color}`}>{statusStyle.icon}</div><div><div className="font-bold text-slate-700">{c.fournisseur}</div><div className="text-xs text-slate-400 flex items-center gap-1">{new Date(c.created_at).toLocaleDateString()} • <span className={`px-1.5 py-0.5 rounded ${statusStyle.color} text-[10px]`}>{statusStyle.label}</span></div></div></div>{c.has_litige && <AlertTriangle size={18} className="text-red-500"/>}</div> ); })}</div>)}</div>))}</div>
            </div>
        )}

        {/* VUE BASE ARTICLES */}
        {viewCmd === 'stocks' && ( <div className="animate-in slide-in-from-right duration-200"><div className="flex items-center gap-3 mb-4"><button onClick={() => setViewCmd('menu')} className="bg-white border border-slate-200 p-2 rounded-xl text-slate-500 hover:bg-slate-50"><ChevronLeft/></button><h3 className="font-bold text-lg">Base Ingrédients</h3></div><div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 mb-4 sticky top-20 z-10 overflow-x-auto whitespace-nowrap scrollbar-hide">{FAMILLES_LIST.map(f => (<button key={f} onClick={() => setFiltreFamille(f)} className={`mr-2 px-3 py-1 rounded-lg text-xs font-bold transition-colors ${filtreFamille === f ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500'}`}>{f}</button>))}</div><div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden"><div className="p-3 bg-slate-50 border-b border-slate-100 font-bold text-slate-400 text-[10px] uppercase flex tracking-wider"><span className="w-2/5">Produit</span><span className="w-1/5 text-center">Ref.</span><span className="w-1/5 text-center">Frn.</span><span className="w-1/5 text-center">Edit</span></div><div className="divide-y divide-slate-50 max-h-[65vh] overflow-y-auto">{getFilteredIngredients().map(i => (<div key={i.id} className="flex items-center p-3 text-xs hover:bg-slate-50 transition-colors"><div className="w-2/5 font-medium text-slate-700 truncate">{i.nom} {(i.allergenes && i.allergenes.length > 0) && <span className="ml-1 text-[8px]">⚠️</span>}</div><div className="w-1/5 text-center text-slate-400 truncate">{i.reference_fournisseur || '-'}</div><div className="w-1/5 text-center text-slate-500">{i.fournisseur}</div><div className="w-1/5 flex justify-center"><button onClick={() => setEditingIngredient(i)} className="bg-white border border-slate-200 p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"><Edit3 size={14}/></button></div></div>))}</div></div></div> )}

        {/* INVENTAIRE 3-en-1 */}
        {activeTab === 'inventaire' && ( <div className="animate-in fade-in"><div className="flex justify-between items-center mb-6"><h2 className="text-2xl font-black text-slate-800 flex items-center gap-2"><List className="text-purple-600"/> Inventaire</h2><div className="flex bg-slate-100 p-1 rounded-xl"><button onClick={()=>setInventoryMode('view')} className={`px-3 py-1 rounded-lg text-xs font-bold ${inventoryMode==='view'?'bg-white shadow':''}`}><Eye size={14} className="inline mr-1"/>Vue</button><button onClick={()=>setInventoryMode('input')} className={`px-3 py-1 rounded-lg text-xs font-bold ${inventoryMode==='input'?'bg-white shadow':''}`}><Edit3 size={14} className="inline mr-1"/>Saisie</button>{userProfile.role!=='cuisine' && <button onClick={()=>setInventoryMode('analysis')} className={`px-3 py-1 rounded-lg text-xs font-bold ${inventoryMode==='analysis'?'bg-white shadow':''}`}><TrendingUp size={14} className="inline mr-1"/>Admin</button>}</div></div>{inventoryMode === 'view' && (<div className="space-y-4 pb-20"><div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">{FAMILLES_LIST.map(f => ( <button key={f} onClick={() => setFiltreFamille(f)} className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all ${filtreFamille === f ? 'bg-purple-600 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200'}`}>{f}</button> ))}</div>{ingredients.filter(i => filtreFamille === 'Tout' || i.famille === filtreFamille).map(i => ( <div key={i.id} className="bg-white p-3 rounded-xl border border-slate-100 flex justify-between items-center shadow-sm"><div><div className="font-bold text-slate-700">{i.nom} ({i.unite})</div><div className="text-xs text-slate-400">{i.famille}</div></div><div className={`font-black px-3 py-1 rounded-lg ${i.stock_actuel <= 0 ? 'bg-red-100 text-red-600' : i.stock_actuel < i.stock_ideal ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>{i.stock_actuel}</div></div> ))}</div>)}{inventoryMode !== 'view' && (<>{inventoryData.length === 0 ? ( <div className="text-center py-10"><button onClick={startInventory} className="bg-purple-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg">Démarrer Comptage</button></div> ) : (<div className="pb-24">{inventoryMode === 'analysis' && <button onClick={handleExportInventory} className="w-full bg-green-100 text-green-700 py-2 rounded-lg font-bold mb-4 flex items-center justify-center gap-2"><FileSpreadsheet size={16}/> Télécharger Excel Stock</button>}{inventoryData.map(i => ( <div key={i.id} className="bg-white p-3 rounded-xl border border-slate-100 mb-2 flex items-center justify-between"><div className="w-1/3 text-sm font-bold truncate">{i.nom} <span className="text-xs font-normal text-slate-400">({i.unite})</span></div>{inventoryMode === 'analysis' && (<div className="text-xs text-slate-400 text-center w-1/4">Théo: {i.stock_actuel}</div>)}<div className="flex items-center gap-2"><input type="number" className="w-16 p-2 border rounded-lg font-bold text-center bg-slate-50" value={i.stock_physique} onChange={(e)=>updateInventoryLine(i.id, e.target.value)}/>{inventoryMode === 'analysis' && (<div className="text-xs font-bold text-slate-500 w-16 text-right">{((i.stock_physique - i.stock_actuel) * i.prix_achat_moyen).toFixed(1)}€</div>)}</div></div> ))}<div className="fixed bottom-24 left-4 right-4"><button onClick={validerInventaire} className="w-full bg-green-600 text-white py-4 rounded-xl font-bold shadow-xl">VALIDER & TERMINER</button></div></div>)}</>)}</div> )}

        {/* ONGLET LIVRAISON / STOCK (V57 avec bouton SCAN) */}
        {activeTab === 'livraison' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                {modeReception === 'choix' && ( 
                    <div className="space-y-6"> 
                        <h2 className="text-2xl font-black mb-6 text-slate-800 flex items-center gap-2"><Truck className="text-blue-600"/> Réception & Stock</h2>
                        
                        {/* SECTION SCAN RESERVEE SUPER ADMIN (V57) */}
                        {userProfile.role === 'super_admin' && (
                            <div className="bg-purple-100 border border-purple-200 p-4 rounded-xl">
                                <h3 className="font-bold text-purple-800 mb-2 flex items-center gap-2"><Crown size={16}/> Zone Test : Scan IA</h3>
                                <button onClick={() => fileInputRef.current.click()} className="w-full bg-purple-600 text-white py-3 rounded-lg font-bold flex justify-center items-center gap-2 hover:bg-purple-700 transition-all">
                                    <Camera size={18}/> Scanner un BL
                                </button>
                                <input type="file" ref={fileInputRef} onChange={handleScanUpload} className="hidden" accept="image/*" />
                            </div>
                        )}

                        <div>
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2"><Clock size={12}/> En attente</h3>
                            {commandesEnAttente.length === 0 ? <div className="p-6 border-2 border-dashed border-slate-200 rounded-xl text-center text-slate-400 text-sm">Rien à réceptionner aujourd'hui 😴</div> : <div className="space-y-3">{commandesEnAttente.map(c => ( <div key={c.id} onClick={() => demarrerReception(c)} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 cursor-pointer hover:shadow-md hover:border-blue-200 transition-all flex justify-between items-center group"><div><div className="font-bold text-slate-800 text-lg group-hover:text-blue-600 transition-colors">{c.fournisseur}</div><div className="text-xs text-slate-400 font-mono mt-1">{c.reference_officielle}</div></div><div className="bg-blue-50 text-blue-600 px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1 group-hover:bg-blue-600 group-hover:text-white transition-colors">GO <Search size={12}/></div></div> ))}</div>}
                        </div>
                        <div className="pt-4 space-y-3">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Mouvements Internes</h3>
                            <button onClick={() => setModeReception('libre')} className="w-full bg-white border border-slate-200 text-slate-600 py-4 rounded-xl font-bold shadow-sm hover:bg-slate-50 transition-all flex items-center justify-center gap-2"><ShoppingBag size={18}/> Entrée Libre</button> 
                            <div className="grid grid-cols-2 gap-3"><button onClick={() => setShowPerteModal(true)} className="bg-red-50 text-red-600 py-4 rounded-xl font-bold border border-red-100 hover:bg-red-100 transition-all flex flex-col items-center gap-1"><Trash2 size={24}/> Déclarer Perte</button><button onClick={() => setShowTransfoModal(true)} className="bg-green-50 text-green-600 py-4 rounded-xl font-bold border border-green-100 hover:bg-green-100 transition-all flex flex-col items-center gap-1"><RefreshCw size={24}/> Transformer</button></div>
                        </div> 
                    </div> 
                )}
                {modeReception === 'commande' && receptionEnCours && ( <div className="bg-white rounded-2xl shadow-xl overflow-hidden animate-in zoom-in duration-200"><div className="bg-slate-900 p-6 text-white flex justify-between items-center"><div><h3 className="font-bold text-lg">{receptionEnCours.info.fournisseur}</h3><div className="text-xs text-slate-400 font-mono mt-1">{receptionEnCours.info.reference_officielle}</div></div><button onClick={() => setModeReception('choix')} className="bg-white/10 p-2 rounded-full hover:bg-white/20 transition-colors"><X size={20}/></button></div><div className="p-3 bg-amber-50 text-xs font-bold text-amber-800 border-b border-amber-100 flex items-center justify-center gap-2"> <AlertTriangle size={14}/> Signalez les manquants facturés ! </div><div className="divide-y divide-slate-50 max-h-[60vh] overflow-y-auto">{receptionEnCours.lignes.map((item, idx) => ( <div key={item.id} className={`p-4 transition-colors ${item.statut_ligne === 'litige' ? 'bg-red-50' : item.statut_ligne === 'rupture' ? 'bg-slate-100 opacity-60' : ''}`}><div className="flex justify-between items-center mb-3"> <span className="font-bold text-slate-700">{item.nom_ingredient}</span> <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-lg">{item.quantite} {item.unite}</span> </div><div className="flex gap-3 items-center"><div className="flex-1 relative"><input type="number" className={`w-full border-2 p-3 rounded-xl text-center font-bold text-lg outline-none focus:ring-2 ${item.qte_recue < item.quantite ? 'border-red-200 text-red-600 focus:ring-red-500' : 'border-slate-100 text-green-600 focus:ring-green-500'}`} value={item.qte_recue} onChange={(e) => updateLigneReception(idx, 'qte_recue', e.target.value)} /><span className="absolute right-3 top-4 text-xs font-bold text-slate-300">{item.unite}</span></div><div className="w-1/2"> {item.qte_recue < item.quantite ? ( <select className={`w-full p-3 rounded-xl text-xs font-bold border-2 outline-none ${item.statut_ligne === 'litige' ? 'bg-red-600 text-white border-red-600' : 'bg-slate-200 text-slate-600 border-slate-200'}`} value={item.statut_ligne} onChange={(e) => updateLigneReception(idx, 'statut_ligne', e.target.value)} > <option value="rupture">Rupture (0€)</option> <option value="litige">LITIGE (Facturé)</option> </select> ) : ( <div className="text-xs font-bold text-green-600 flex items-center justify-center gap-1 bg-green-50 p-3 rounded-xl border border-green-100"><CheckSquare size={16}/> OK</div> )} </div></div></div> ))}</div><div className="p-4 border-t border-slate-100"> <button onClick={validerReceptionFinale} className="w-full bg-green-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-green-200 hover:bg-green-700 transition-all text-lg">VALIDER L'ENTRÉE</button> </div></div> )}
                {modeReception === 'libre' && ( <div className="bg-white rounded-2xl shadow-xl overflow-hidden animate-in slide-in-from-right duration-200"><div className="bg-slate-800 p-4 text-white flex items-center gap-3"><button onClick={() => setModeReception('choix')}><ChevronLeft/></button><h3 className="font-bold">Entrée Libre</h3></div><div className="p-4 space-y-4"><select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-medium" onChange={e=>setSelectedIng(e.target.value)}><option>Choisir produit...</option>{ingredients.map(i=><option key={i.id} value={i.id}>{i.nom}</option>)}</select><div className="flex gap-3"><input type="number" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-center font-bold" placeholder="Qté (+)" value={qteLivraison} onChange={e=>setQteLivraison(e.target.value)}/>{userProfile.role!=='cuisine'&&<input type="number" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-center font-bold" placeholder="Prix (€)" value={prixLivraison} onChange={e=>setPrixLivraison(e.target.value)}/>}</div><button onClick={ajouterAuBon} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold flex justify-center gap-2 items-center hover:bg-blue-700"><Plus size={18}/> AJOUTER</button></div>{panierLivraison.length>0 && <div className="bg-slate-50 p-4 border-t border-slate-100">{panierLivraison.map((item,i)=><div key={i} className="flex justify-between py-3 border-b border-slate-200 last:border-0 text-sm"><span>{item.nom}</span><span className="font-bold text-green-600">+{item.qte} {item.unite}</span></div>)}<button onClick={validerLivraisonLibre} className="w-full mt-4 bg-green-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-green-200 hover:bg-green-700">CONFIRMER</button></div>}</div> )}
            </div>
        )}

        {/* MODAL SCAN IA (V57) */}
        {showScanModal && (
            <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg h-[90vh] flex flex-col animate-in zoom-in duration-200">
                    <div className="p-4 bg-purple-600 text-white flex justify-between items-center rounded-t-2xl">
                        <h3 className="font-bold text-lg flex items-center gap-2"><Sparkles/> Analyse du Bon</h3>
                        {!isScanning && <button onClick={() => setShowScanModal(false)}><X/></button>}
                    </div>
                    
                    {isScanning ? (
                        <div className="flex-1 flex flex-col items-center justify-center gap-4">
                            <div className="animate-spin text-4xl">🔮</div>
                            <p className="text-slate-500 font-bold animate-pulse text-center">Gemini analyse l'image...<br/><span className="text-xs font-normal">Recherche des articles et correspondance stock</span></p>
                        </div>
                    ) : (
                        <>
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            <div className="bg-blue-50 p-3 rounded-lg text-xs text-blue-700 mb-4">
                                Vérifiez bien les correspondances. Si vous sélectionnez un produit, l'IA s'en souviendra pour la prochaine fois !
                            </div>
                            {scanResults.length === 0 ? <p className="text-center text-slate-400">Aucun article détecté.</p> : 
                                scanResults.map((item, index) => (
                                    <div key={index} className={`p-3 border rounded-xl flex flex-col gap-2 ${item.status === 'found' ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'}`}>
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="font-bold text-slate-800">{item.raw_name}</div>
                                                <div className="text-xs font-mono text-slate-400">Lu: {item.qty} {item.unit}</div>
                                            </div>
                                            {item.status === 'found' && <span className="bg-green-200 text-green-800 text-[10px] px-2 py-1 rounded-full font-bold">CONNU</span>}
                                            {item.status === 'guess' && <span className="bg-orange-200 text-orange-800 text-[10px] px-2 py-1 rounded-full font-bold">DEVINÉ</span>}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <ArrowRightLeft size={16} className="text-slate-400"/>
                                            <select 
                                                className={`flex-1 p-2 rounded-lg text-sm border ${item.matchId ? 'border-green-300 bg-white font-bold text-slate-800' : 'border-red-300 bg-red-50 text-red-500'}`}
                                                value={item.matchId}
                                                onChange={(e) => updateScanMatch(index, e.target.value)}
                                            >
                                                <option value="">-- Ignorer cet article --</option>
                                                {ingredients.map(ing => (
                                                    <option key={ing.id} value={ing.id}>{ing.nom}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                ))
                            }
                        </div>
                        <div className="p-4 border-t border-slate-100 flex gap-2">
                            <button onClick={() => setShowScanModal(false)} className="flex-1 py-3 font-bold text-slate-500">Annuler</button>
                            <button onClick={validateScan} className="flex-1 bg-green-600 text-white py-3 rounded-xl font-bold shadow-lg">VALIDER LE STOCK</button>
                        </div>
                        </>
                    )}
                </div>
            </div>
        )}

        {/* MODAL REFUS (V61) */}
        {showRefusalModal && (
            <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-in zoom-in">
                    <h3 className="text-lg font-black text-slate-800 mb-2 flex items-center gap-2"><Ban className="text-red-500"/> Refuser la commande</h3>
                    <p className="text-sm text-slate-500 mb-4">Pourquoi refusez-vous cette commande ? Le cuisinier verra ce message.</p>
                    <textarea 
                        className="w-full border-2 border-slate-200 p-3 rounded-xl font-bold text-sm min-h-[100px]" 
                        placeholder="Ex: Budget dépassé, Erreur de produit..."
                        autoFocus
                        value={refusalReason}
                        onChange={(e) => setRefusalReason(e.target.value)}
                    />
                    <div className="flex gap-2 mt-4">
                        <button onClick={() => setShowRefusalModal(false)} className="flex-1 py-3 text-slate-500 font-bold">Annuler</button>
                        <button onClick={confirmRefusal} className="flex-1 bg-red-600 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-red-700">CONFIRMER REFUS</button>
                    </div>
                </div>
            </div>
        )}

        {/* MODAL IA, PERTE, ETC */}
        {showAiModal && <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"><div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm max-h-[80vh] overflow-y-auto p-6 animate-in fade-in zoom-in border-t-8 border-purple-600"><div className="flex justify-between items-center mb-4"><h3 className="text-lg font-black text-purple-600 flex items-center gap-2"><Sparkles/> Chef Gemini</h3><button onClick={()=>setShowAiModal(false)}><X/></button></div>{aiLoading ? <div className="text-center py-10 space-y-4"><div className="animate-spin text-4xl">🔮</div><p className="text-slate-500 font-bold animate-pulse">Réflexion en cours...</p></div> : <div className="prose prose-sm prose-purple overflow-y-auto whitespace-pre-wrap font-medium text-slate-600">{aiResponse}</div>}</div></div>}
        {showLogModal && ( <div className="fixed inset-0 bg-black/50 z-50 flex justify-end"><div className="bg-white w-3/4 max-w-md h-full p-4 overflow-y-auto animate-in slide-in-from-right"><div className="flex justify-between items-center mb-4"><h3 className="font-bold text-lg">Journal d'Activité</h3><button onClick={()=>setShowLogModal(false)}><X/></button></div><div className="space-y-2">{logs.map(l => ( <div key={l.id} className="text-xs p-2 bg-slate-50 rounded border border-slate-100"><div className="font-bold text-slate-700">{new Date(l.created_at).toLocaleString()}</div><div className="text-blue-600">{l.user_email}</div><div><span className="font-bold">{l.action}</span> : {l.details}</div></div> ))}</div></div></div> )}
        
        {/* DETAIL COMMANDE V61 */}
        {commandeDetail && ( 
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden animate-in zoom-in duration-200">
                <div className="bg-slate-800 p-6 text-white flex justify-between items-start">
                    <div>
                        <h2 className="text-xl font-bold">{commandeDetail.Info.fournisseur}</h2>
                        <div className="text-xs text-slate-400 mt-1 font-mono">{commandeDetail.Info.reference_officielle}</div>
                    </div>
                    <button onClick={()=>setCommandeDetail(null)} className="bg-white/10 p-2 rounded-full hover:bg-white/20 transition-colors"><X size={20}/></button>
                </div>
                
                {/* ALERTE REFUS */}
                {commandeDetail.Info.status === 'refused' && (
                    <div className="bg-red-50 p-4 border-b border-red-100 text-red-800">
                        <div className="font-bold flex items-center gap-2 mb-1"><Ban size={16}/> COMMANDE REFUSÉE</div>
                        <div className="text-sm italic">"{commandeDetail.Info.refusal_reason}"</div>
                    </div>
                )}

                <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
                    {commandeDetail.Lignes.map(l => (<div key={l.id} className="flex justify-between text-sm border-b border-slate-50 pb-2 last:border-0"><span className="text-slate-600">{l.nom_ingredient}</span><span className="font-bold text-slate-800">{l.quantite} {l.unite}</span></div>))}
                </div>
                
                {/* ACTIONS ADMIN : VALIDER OU REFUSER */}
                {(userProfile.role === 'super_admin' || userProfile.role === 'admin_regie') && commandeDetail.Info.status === 'pending' && (
                    <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2">
                        <button onClick={() => openRefusalModal(commandeDetail.Info)} className="flex-1 bg-red-100 text-red-700 py-3 rounded-xl font-bold shadow-sm hover:bg-red-200 transition-all flex justify-center items-center gap-2"><Ban size={18}/> REFUSER</button>
                        <button onClick={() => validerCommandeRegie(commandeDetail.Info)} className="flex-[2] bg-blue-600 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-blue-700 transition-all flex justify-center items-center gap-2"><CheckSquare size={18}/> VALIDER</button>
                    </div>
                )}

                {/* ACTIONS CUISINE : EXCEL & CONFIRMATION ENVOI */}
                {(commandeDetail.Info.status === 'validated' || commandeDetail.Info.status === 'sent') && (
                    <div className="p-4 bg-slate-50 border-t border-slate-100 space-y-3">
                        <input type="file" id="templateInput" style={{display:'none'}} accept=".xlsx" onChange={(e)=>handleTemplateUpload(e, commandeDetail.Info)}/>
                        
                        <button onClick={validerEtUpload} disabled={isProcessingExcel} className="w-full bg-white border-2 border-green-600 text-green-600 py-3 rounded-xl font-bold hover:bg-green-50 flex justify-center gap-2 items-center transition-all">
                            {isProcessingExcel ? <Clock className="animate-spin"/> : <Upload size={18}/>} 
                            {commandeDetail.Info.status === 'sent' ? 'RE-TÉLÉCHARGER EXCEL' : 'GÉNÉRER EXCEL'}
                        </button>

                        {/* BOUTON CONFIRMATION ENVOI (Seulement si pas encore envoyé) */}
                        {commandeDetail.Info.status === 'validated' && (
                            <button onClick={() => confirmSendToSupplier(commandeDetail.Info)} className="w-full bg-green-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-green-200 hover:bg-green-700 flex justify-center gap-2 items-center transition-all animate-in slide-in-from-bottom">
                                <Send size={18}/> MARQUER COMME ENVOYÉ
                            </button>
                        )}
                        
                        {commandeDetail.Info.status === 'sent' && (
                            <div className="text-center text-xs font-bold text-green-600 flex justify-center items-center gap-1">
                                <CheckCircle size={14}/> Commande marquée comme envoyée
                            </div>
                        )}
                    </div>
                )}
            </div> 
        )}
        
        {/* RECETTES (MISE A JOUR V42) */}
        {activeTab === 'recettes' && !selectedRecette && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                {/* HEADERS */}
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2"><ChefHat className="text-orange-500"/> Recettes</h2>
                    {/* CUISINE A LE DROIT DE CRÉER */}
                    {(userProfile.role === 'cuisine' || userProfile.role === 'super_admin') && (
                        <button onClick={() => setIsCreatingRecette(true)} className="bg-orange-500 text-white px-4 py-2 rounded-xl font-bold shadow-lg hover:bg-orange-600 flex items-center gap-2 text-sm"><Plus size={16}/> Créer</button>
                    )}
                </div>
                
                {/* FILTRES PAR FAMILLE */}
                <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide mb-2">
                    <button onClick={() => setFilterRecetteFamily('Toutes')} className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${filterRecetteFamily === 'Toutes' ? 'bg-orange-500 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200'}`}>Toutes les fiches</button>
                    {Object.keys(RECETTE_STRUCTURE).map(fam => (
                        <button key={fam} onClick={() => setFilterRecetteFamily(fam)} className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${filterRecetteFamily === fam ? 'bg-orange-500 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200'}`}>{fam}</button>
                    ))}
                </div>

                <div className="grid gap-3">
                    {getFilteredRecettes().length === 0 ? <div className="text-center py-10 text-slate-400">Aucune recette dans cette famille.</div> : getFilteredRecettes().map(r => (
                        <div key={r.id} onClick={async()=>{const{data}=await supabase.from('recette_ingredients').select('*, ingredients(*)').eq('recette_id',r.id);setRecetteDetails(data||[]);setSelectedRecette(r); setEditRecetteSubFam(r.categorie || ''); setEditRecetteFam(findFamilyOfRecipe(r.categorie) || 'Petite Restauration');}} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 cursor-pointer hover:border-orange-200 hover:shadow-md transition-all flex justify-between items-center">
                            <div className="font-bold text-lg text-slate-700">{r.nom_recette}</div>
                            <div className="bg-orange-50 text-orange-600 text-xs px-2 py-1 rounded font-bold max-w-[50%] truncate">{r.categorie || 'Plat'}</div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* DETAIL RECETTE */}
        {activeTab === 'recettes' && selectedRecette && ( 
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden animate-in zoom-in duration-200">
                <div className="bg-orange-500 p-6 text-white flex justify-between items-start">
                    <div>
                        <h2 className="text-xl font-bold">{selectedRecette.nom_recette}</h2>
                        <div className="text-xs bg-white/20 inline-block px-2 py-1 rounded mt-1">{selectedRecette.categorie || 'Plat'} (+{getMargeApplicable(selectedRecette.categorie).toFixed(2)}€)</div>
                    </div>
                    <button onClick={()=>setSelectedRecette(null)} className="bg-white/20 p-2 rounded-full hover:bg-white/30 transition-colors"><X size={20}/></button>
                </div>
                
                {/* ZONE ADMIN : CORRECTION CATEGORIE */}
                {(userProfile.role === 'super_admin' || userProfile.role === 'admin_regie') && (
                    <div className="bg-slate-800 p-4 m-4 rounded-xl text-white border-2 border-amber-500 shadow-lg">
                        <div className="flex items-center gap-2 mb-3 text-sm font-black uppercase text-amber-500"><Settings size={16}/> Zone Admin : Modifier Famille</div>
                        <div className="flex flex-col gap-2">
                            <select className="w-full bg-slate-700 border border-slate-600 rounded-lg text-sm p-3 text-white font-bold" value={editRecetteFam} onChange={e => { setEditRecetteFam(e.target.value); setEditRecetteSubFam(RECETTE_STRUCTURE[e.target.value][0]); }}>
                                {Object.keys(RECETTE_STRUCTURE).map(f => <option key={f} value={f}>{f}</option>)}
                            </select>
                            <select className="w-full bg-slate-700 border border-slate-600 rounded-lg text-sm p-3 text-white" value={editRecetteSubFam} onChange={e => setEditRecetteSubFam(e.target.value)}>
                                {(RECETTE_STRUCTURE[editRecetteFam] || []).map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <button onClick={updateRecetteCategoryAdmin} className="w-full mt-3 bg-amber-500 hover:bg-amber-600 text-slate-900 py-3 rounded-lg font-black flex items-center justify-center gap-2 transition-all"><Save size={18}/> SAUVEGARDER CORRECTION</button>
                    </div>
                )}

                <div className="p-6 pt-0">
                    <div className="flex gap-2 mb-6">
                        <div className="flex-1 bg-slate-50 p-3 rounded-xl border border-slate-100 text-center"><div className="text-xs font-bold text-slate-400 uppercase">Coût Matière</div><div className="text-xl font-black text-slate-700">{calculerPrixRevientRecette().toFixed(2)} €</div></div>
                        <div className="flex-1 bg-green-50 p-3 rounded-xl border border-green-100 text-center"><div className="text-xs font-bold text-green-600 uppercase">Prix Vente Min</div><div className="text-xl font-black text-green-700">{(calculerPrixRevientRecette() + getMargeApplicable(selectedRecette.categorie)).toFixed(2)} €</div></div>
                    </div>
                    
                    <div className="mb-6 flex flex-wrap gap-2">{getRecetteAllergenes().length > 0 ? getRecetteAllergenes().map(a => (<span key={a} className="bg-orange-100 text-orange-800 text-xs font-bold px-3 py-1 rounded-full border border-orange-200 shadow-sm">{a}</span>)) : <span className="text-xs text-slate-400 italic bg-slate-100 px-3 py-1 rounded-full">Aucun allergène</span>}</div>
                    
                    <div className="space-y-4 mb-6">
                        {recetteDetails.map(i => (
                            <div key={i.id} className="flex justify-between text-sm border-b border-slate-50 pb-2 last:border-0 group">
                                <span className="text-slate-600">{i.ingredients.nom} <span className="text-xs text-orange-500">({(i.ingredients.prix_achat_moyen * i.quantite_requise).toFixed(2)}€)</span></span>
                                <div className="flex items-center gap-3">
                                    <span className="font-black text-slate-800">{i.quantite_requise} {i.unite_recette}</span>
                                    {/* SEULE LA CUISINE / ADMIN PEUT SUPPRIMER */}
                                    {(userProfile.role === 'cuisine' || userProfile.role === 'super_admin') && (
                                        <button onClick={() => supprimerIngredientRecette(i.id)} className="text-red-300 hover:text-red-500"><Trash2 size={14}/></button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* SEULE LA CUISINE / ADMIN PEUT AJOUTER */}
                    {(userProfile.role === 'cuisine' || userProfile.role === 'super_admin') && (
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">Ajouter Ingrédient</h4>
                        <div className="flex gap-2 mb-2">
                            <select className="flex-1 p-2 rounded-lg border border-slate-200 text-sm" onChange={e => setAjoutIngredientRecette(e.target.value)} value={ajoutIngredientRecette || ''}>
                                <option value="">Choisir...</option>
                                {ingredients.map(i => <option key={i.id} value={i.id}>{i.nom}</option>)}
                            </select>
                            <div className="relative w-24">
                                <input type="number" className="w-full p-2 pr-8 rounded-lg border border-slate-200 text-sm font-bold text-center" placeholder="Qté" value={qteAjoutRecette} onChange={e => setQteAjoutRecette(e.target.value)} />
                                <span className="absolute right-2 top-2.5 text-[10px] font-black text-slate-400 pointer-events-none">{getSelectedIngredientUnit()}</span>
                            </div>
                        </div>
                        <button onClick={ajouterIngredientAuPlat} className="w-full bg-slate-800 text-white py-2 rounded-lg font-bold text-sm">AJOUTER</button>
                    </div>
                    )}
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
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Famille</label>
                            <select className="w-full border-2 border-slate-200 p-3 rounded-xl font-bold mb-2" value={newRecetteFamille} onChange={e => { setNewRecetteFamille(e.target.value); setNewRecetteSousFamille(RECETTE_STRUCTURE[e.target.value][0]); }}>
                                {Object.keys(RECETTE_STRUCTURE).map(fam => <option key={fam} value={fam}>{fam}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Sous-Famille</label>
                            <select className="w-full border-2 border-slate-200 p-3 rounded-xl font-bold" value={newRecetteSousFamille} onChange={e => setNewRecetteSousFamille(e.target.value)}>
                                {RECETTE_STRUCTURE[newRecetteFamille].map(sub => <option key={sub} value={sub}>{sub}</option>)}
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

        {/* MODAL CREATION (Simplifié) */}
        {showCreateFournisseur && ( <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"><div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-in fade-in zoom-in"><h3 className="text-lg font-black text-slate-800 mb-4">Nouveau Fournisseur</h3><div className="space-y-3"><input className="w-full border p-3 rounded-xl" placeholder="Nom Société *" value={newFournData.nom} onChange={e=>setNewFournData({...newFournData, nom: e.target.value})}/><input className="w-full border p-3 rounded-xl" placeholder="Adresse" value={newFournData.adresse} onChange={e=>setNewFournData({...newFournData, adresse: e.target.value})}/><div className="flex gap-2"><input className="w-full border p-3 rounded-xl" placeholder="Téléphone" value={newFournData.tel} onChange={e=>setNewFournData({...newFournData, tel: e.target.value})}/><input className="w-full border p-3 rounded-xl" placeholder="TVA" value={newFournData.tva} onChange={e=>setNewFournData({...newFournData, tva: e.target.value})}/></div><input className="w-full border p-3 rounded-xl" placeholder="Email" value={newFournData.email} onChange={e=>setNewFournData({...newFournData, email: e.target.value})}/><div className="flex gap-2"><button onClick={()=>setShowCreateFournisseur(false)} className="flex-1 py-3 text-slate-400 font-bold">Annuler</button><button onClick={demanderCreationFournisseur} className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold">Envoyer</button></div></div></div></div> )}
        {showCreateIngredient && ( <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"><div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-in fade-in zoom-in"><h3 className="text-lg font-black text-slate-800 mb-4">Nouvel Article</h3><div className="space-y-3"><input className="w-full border p-3 rounded-xl font-bold" placeholder="Nom *" value={newIngData.nom} onChange={e=>setNewIngData({...newIngData, nom: e.target.value})}/><div className="flex gap-2"><select className="w-1/2 border p-3 rounded-xl" value={newIngData.famille} onChange={e=>setNewIngData({...newIngData, famille: e.target.value})}>{FAMILLES_LIST.map(f=><option key={f} value={f}>{f}</option>)}</select><select className="w-1/2 border p-3 rounded-xl" value={newIngData.unite} onChange={e=>setNewIngData({...newIngData, unite: e.target.value})}><option value="kg">kg</option><option value="L">L</option><option value="pce">pce</option></select></div><select className="w-full border p-3 rounded-xl" value={newIngData.fournisseur} onChange={e=>setNewIngData({...newIngData, fournisseur: e.target.value})}><option value="">-- Fournisseur --</option><option value="Solucious">Solucious</option><option value="Bidfood">Bidfood</option><option value="Pochet">Pochet</option><option value="Autre">Autre...</option></select><input className="w-full border p-3 rounded-xl" type="number" placeholder="Prix € HT" value={newIngData.prix} onChange={e=>setNewIngData({...newIngData, prix: e.target.value})}/><div className="flex gap-2"><button onClick={()=>setShowCreateIngredient(false)} className="flex-1 py-3 text-slate-400 font-bold">Annuler</button><button onClick={demanderCreationIngredient} className="flex-1 bg-green-600 text-white py-3 rounded-xl font-bold">Envoyer</button></div></div></div></div> )}
        {editingIngredient && ( <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"><div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm max-h-[90vh] overflow-y-auto flex flex-col animate-in fade-in zoom-in duration-200"><div className="p-4 border-b flex justify-between items-center bg-slate-50 rounded-t-2xl"><h3 className="font-black text-lg text-slate-800">{editingIngredient.nom}</h3><button onClick={() => setEditingIngredient(null)}><X size={24} className="text-slate-400 hover:text-slate-600"/></button></div><div className="p-4 space-y-4"><div><label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Famille</label><select className="w-full border-slate-200 p-3 rounded-xl bg-slate-50 font-medium" value={editingIngredient.famille || 'Divers'} onChange={e => setEditingIngredient({...editingIngredient, famille: e.target.value})}>{FAMILLES_LIST.map(f=><option key={f} value={f}>{f}</option>)}</select></div><div><label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Code-Barre</label><input type="text" className="w-full border-slate-200 p-3 rounded-xl bg-slate-50 font-mono text-sm" placeholder="Scanner..." value={editingIngredient.code_barre || ''} onChange={e => setEditingIngredient({...editingIngredient, code_barre: e.target.value})} /></div><div><label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Référence Frn.</label><input type="text" className="w-full border-slate-200 p-3 rounded-xl bg-slate-50 text-sm" placeholder="ex: PO-JAM-001" value={editingIngredient.reference_fournisseur || ''} onChange={e => setEditingIngredient({...editingIngredient, reference_fournisseur: e.target.value})} /></div><div className="flex gap-2"><div className="w-1/2"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fournisseur</label><select className="w-full border-slate-200 p-3 rounded-xl bg-slate-50 text-sm" value={editingIngredient.fournisseur || 'Autre'} onChange={e => setEditingIngredient({...editingIngredient, fournisseur: e.target.value})}><option>Solucious</option><option>Bidfood</option><option>Pochet</option><option>Autre</option></select></div><div className="w-1/2"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Unité</label><select className="w-full border-slate-200 p-3 rounded-xl bg-slate-50 text-sm" value={editingIngredient.unite || 'kg'} onChange={e => setEditingIngredient({...editingIngredient, unite: e.target.value})}><option value="kg">kg (Kilo)</option><option value="L">L (Litre)</option><option value="pce">pce (Pièce)</option></select></div></div><div className="flex gap-2"><div className="w-1/2"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Stock Idéal</label><input type="number" className="w-full border-slate-200 p-3 rounded-xl bg-slate-50 text-lg font-bold text-blue-600" value={editingIngredient.stock_ideal || 0} onChange={e => setEditingIngredient({...editingIngredient, stock_ideal: parseFloat(e.target.value)})} /></div><div className="w-1/2"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Prix Achat (€)</label><input type="number" className="w-full border-slate-200 p-3 rounded-xl bg-slate-50 text-lg font-bold text-green-600" value={editingIngredient.prix_achat_moyen || 0} onChange={e => setEditingIngredient({...editingIngredient, prix_achat_moyen: parseFloat(e.target.value)})} /></div></div><div className="bg-orange-50 p-4 rounded-xl border border-orange-100"><label className="text-[10px] font-bold text-orange-800 uppercase flex items-center gap-1 mb-3"><AlertTriangle size={12}/> Allergènes</label><div className="grid grid-cols-2 gap-2">{ALLERGENES_LIST.map(alg => (<label key={alg} className="flex items-center gap-2 text-xs text-orange-900 font-medium cursor-pointer"><input type="checkbox" className="accent-orange-500 w-4 h-4 rounded" checked={(editingIngredient.allergenes || []).includes(alg)} onChange={() => toggleAllergen(alg)} />{alg}</label>))}</div></div></div><div className="p-4 border-t mt-auto"><button onClick={saveIngredientDetails} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-bold shadow-lg shadow-blue-200 transition-all">ENREGISTRER</button></div></div></div> )}
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