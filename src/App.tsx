import React, { useState, useEffect, useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { ConsumerProfile } from "./components/ConsumerProfile";
import { AdminProfile } from "./components/AdminProfile";
import { useConsumerNotification, useAdminNotification } from "./contexts/NotificationContext";
import {
  Activity,
  Zap,
  Trash2,
  Edit,
  Plus,
  Tv,
  ThermometerSnowflake,
  Fan,
  Lightbulb,
  Cpu,
  RefreshCw,
  LogOut,
  User as UserIcon,
  PieChart as PieChartIcon,
  Calendar,
  CreditCard,
  Leaf,
  AlertTriangle,
  Sparkles,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  Percent,
  CheckCircle,
  HelpCircle,
  Clock,
  X,
  Users,
  FileText,
  Search,
  Filter,
  Download,
  Shield,
  Briefcase
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  CartesianGrid
} from "recharts";
import {
  User,
  Appliance,
  Usage,
  Bill,
  DashboardMetrics,
  SmartInsights,
  CarbonMetrics,
  ProfileMetrics,
  AdminMetrics,
  PaymentRecord
} from "./types";

const getFormatMonthName = (monthStr: string) => {
  if (!monthStr || monthStr.length < 7) return monthStr;
  const parts = monthStr.split("-");
  const year = parts[0];
  const month = parts[1];
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const idx = parseInt(month, 10) - 1;
  return idx >= 0 && idx < 12 ? `${monthNames[idx]} ${year}` : monthStr;
};

export default function App() {
  // Authentication states
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authView, setAuthView] = useState<"login" | "register">("login");
  const [regConnectionType, setRegConnectionType] = useState<"Residential" | "Commercial" | "Industrial">("Residential");
  
  // Auth Form Fields
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");

  // App Navigation Active Tab
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "appliances" | "usage" | "analytics" | "bills" | "profile" | "admin-dashboard" | "admin-bills" | "admin-analytics"
  >("dashboard");

  // Data States
  const [appliances, setAppliances] = useState<Appliance[]>([]);
  const [usageLogs, setUsageLogs] = useState<Usage[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [dashboardMetrics, setDashboardMetrics] = useState<DashboardMetrics | null>(null);
  const [smartInsights, setSmartInsights] = useState<SmartInsights | null>(null);
  const [carbonMetrics, setCarbonMetrics] = useState<CarbonMetrics | null>(null);
  const [profileMetrics, setProfileMetrics] = useState<ProfileMetrics | null>(null);

  // Admin Data States
  const [adminMetrics, setAdminMetrics] = useState<AdminMetrics | null>(null);
  const [adminBills, setAdminBills] = useState<Bill[]>([]);
  const [adminPayments, setAdminPayments] = useState<PaymentRecord[]>([]);
  const [adminConsumers, setAdminConsumers] = useState<User[]>([]);

  // Admin Search & Filter States
  const [adminBillSearchQuery, setAdminBillSearchQuery] = useState("");
  const [adminBillStatusFilter, setAdminBillStatusFilter] = useState<"All" | "Pending" | "Paid" | "Overdue" | "Awaiting Verification">("All");
  const [adminSelectedBillForDetails, setAdminSelectedBillForDetails] = useState<Bill | null>(null);
  const [adminMarkPaidDate, setAdminMarkPaidDate] = useState(new Date().toISOString().substring(0, 10));
  const [selectedBillForInvoice, setSelectedBillForInvoice] = useState<Bill | null>(null);

  const invoiceRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: invoiceRef,
    documentTitle: selectedBillForInvoice 
      ? `Invoice_${selectedBillForInvoice.consumer_id || "ECW10001"}_${selectedBillForInvoice.month.split("-")[1]}${selectedBillForInvoice.month.split("-")[0]}`
      : "Invoice",
  });

  const [adminSelectedConsumer, setAdminSelectedConsumer] = useState<any | null>(null);
  const [adminConsumerSearch, setAdminConsumerSearch] = useState("");
  const [adminConsumerConnFilter, setAdminConsumerConnFilter] = useState("All");

  // Derived Billing Predictions based on actual SQLite logs
  const currentMonthStr = new Date().toISOString().substring(0, 7);
  const currentMonthLogs = usageLogs.filter((u) => u.usage_date.startsWith(currentMonthStr));
  const currentMonthUnits = currentMonthLogs.reduce((sum, u) => sum + u.units, 0);
  const currentBill = currentMonthUnits * 7;
  
  const daysPassed = new Date().getDate();
  const avgDailyUnits = currentMonthUnits / Math.max(1, daysPassed);
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const predictedMonthEndUnits = avgDailyUnits * daysInMonth;
  const predictedMonthEndBill = predictedMonthEndUnits * 7;
  
  // Form/Modal Statuses
  const [applianceModalOpen, setApplianceModalOpen] = useState(false);
  const [editingAppliance, setEditingAppliance] = useState<Appliance | null>(null);
  const [appName, setAppName] = useState("");
  const [appCategory, setAppCategory] = useState("Cooling");
  const [appWattage, setAppWattage] = useState(500);
  const [appDailyHours, setAppDailyHours] = useState(4);
  const [deleteApplianceConfirmOpen, setDeleteApplianceConfirmOpen] = useState(false);
  const [applianceToDelete, setApplianceToDelete] = useState<Appliance | null>(null);

  // Usage Form
  const [usgApplianceId, setUsgApplianceId] = useState("");
  const [usgHours, setUsgHours] = useState(2);
  const [usgDate, setUsgDate] = useState(new Date().toISOString().substring(0, 10));

  // Consume isolated, role-specific notification contexts (stores)
  const consumerNotification = useConsumerNotification();
  const adminNotification = useAdminNotification();

  // Dynamically resolve success and error depending on the current user's role
  const globalSuccess = currentUser?.role === "admin" ? adminNotification.success : consumerNotification.success;
  const globalError = currentUser?.role === "admin" ? adminNotification.error : consumerNotification.error;

  const setGlobalSuccess = (msg: string) => {
    if (currentUser?.role === "admin") {
      adminNotification.setSuccess(msg);
    } else {
      consumerNotification.setSuccess(msg);
    }
  };

  const setGlobalError = (msg: string) => {
    if (currentUser?.role === "admin") {
      adminNotification.setError(msg);
    } else {
      consumerNotification.setError(msg);
    }
  };

  // Dedicated clear actions
  const clearConsumerNotifications = () => {
    consumerNotification.clear();
  };

  const clearAdminNotifications = () => {
    adminNotification.clear();
  };

  // Grid/Utility Status Sim
  const [liveGridStatus] = useState("Normal");

  // Categorized List for presets
  const presetCategories = ["Cooling", "Heating", "Entertainment", "Lighting", "Kitchen", "Utility", "Computing"];
  
  // Custom suggestion presets
  const standardPresets = [
    { name: "Living Room AC", category: "Cooling", wattage: 1500, hours: 6 },
    { name: "Ceiling Fan", category: "Cooling", wattage: 75, hours: 10 },
    { name: "LED Tube Light", category: "Lighting", wattage: 20, hours: 8 },
    { name: "Smart TV", category: "Entertainment", wattage: 120, hours: 4 },
    { name: "Gaming PC", category: "Computing", wattage: 450, hours: 5 },
    { name: "Refrigerator", category: "Kitchen", wattage: 180, hours: 24 },
    { name: "Washing Machine", category: "Utility", wattage: 500, hours: 1 },
    { name: "Water Geyser", category: "Heating", wattage: 2000, hours: 1 }
  ];

  // Robust API Fetch wrapper that adds token headers (supporting iframe fallback)
  const authFetch = (url: string, options: RequestInit = {}) => {
    const token = localStorage.getItem("ecowatt_token");
    const headers = {
      ...(options.headers || {}),
      ...(token ? { "Authorization": `Bearer ${token}` } : {})
    };
    return fetch(url, { ...options, headers });
  };

  // Fetch Session data immediately
  useEffect(() => {
    checkCurrentUser();
  }, []);

  // Fetch Tab Specific Data when authenticated user changes or active tab updates
  useEffect(() => {
    if (currentUser) {
      loadTabData();
    }
  }, [currentUser, activeTab]);

  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === "admin") {
        clearConsumerNotifications();
        if (!activeTab.startsWith("admin-") && activeTab !== "profile") {
          setActiveTab("admin-dashboard");
        }
      } else {
        clearAdminNotifications();
        if (activeTab.startsWith("admin-")) {
          setActiveTab("dashboard");
        }
      }
    } else {
      clearConsumerNotifications();
      clearAdminNotifications();
    }
  }, [currentUser]);

  const checkCurrentUser = async () => {
    try {
      const res = await authFetch("/api/auth/me");
      const data = await res.json();
      if (data.user) {
        setCurrentUser(data.user);
      }
    } catch (err) {
      console.error("Session check broken:", err);
    } finally {
      setAuthLoading(false);
    }
  };

  const loadTabData = async () => {
    try {
      setGlobalError("");
      const is_admin = currentUser && currentUser.role === "admin";
      
      if (is_admin) {
        const [metricRes, billRes, paymentRes, userRes] = await Promise.all([
          authFetch("/api/admin/metrics"),
          authFetch("/api/admin/bills"),
          authFetch("/api/admin/payments"),
          authFetch("/api/admin/users")
        ]);
        
        if (metricRes && metricRes.ok) setAdminMetrics(await metricRes.json());
        if (billRes && billRes.ok) setAdminBills(await billRes.json());
        if (paymentRes && paymentRes.ok) setAdminPayments(await paymentRes.json());
        if (userRes && userRes.ok) setAdminConsumers(await userRes.json());
      }

      const [appRes, useRes, billRes, dashRes, insRes, carbRes, profRes] = await Promise.all([
        authFetch("/api/appliances"),
        authFetch("/api/usage"),
        authFetch("/api/bills"),
        authFetch("/api/dashboard"),
        authFetch("/api/insights"),
        authFetch("/api/carbon"),
        authFetch("/api/profile")
      ]);

      if (appRes && appRes.ok) setAppliances(await appRes.json());
      if (useRes && useRes.ok) setUsageLogs(await useRes.json());
      if (billRes && billRes.ok) setBills(await billRes.json());
      if (dashRes && dashRes.ok) setDashboardMetrics(await dashRes.json());
      if (insRes && insRes.ok) setSmartInsights(await insRes.json());
      if (carbRes && carbRes.ok) setCarbonMetrics(await carbRes.json());
      if (profRes && profRes.ok) setProfileMetrics(await profRes.json());
    } catch (err) {
      setGlobalError("Failed to update dashboard telemetry metrics. Reconnecting...");
    }
  };

  // Auth Operations
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthSuccess("");
    if (!loginEmail || !loginPassword) {
      setAuthError("Please fill out all fields.");
      return;
    }
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || "Login credentials failed.");
      } else {
        if (data.token) {
          localStorage.setItem("ecowatt_token", data.token);
        }
        setAuthSuccess("Login successful. Launching EcoWatt...");
        setTimeout(() => {
          if (data.user && data.user.role === "admin") {
            setActiveTab("admin-dashboard");
          } else {
            setActiveTab("dashboard");
          }
          setCurrentUser(data.user);
          setLoginPassword("");
        }, 800);
      }
    } catch (err) {
      setAuthError("Network communication failure.");
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthSuccess("");
    if (!regName || !regEmail || !regPassword || !regConfirmPassword) {
      setAuthError("Please complete all registration fields.");
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setAuthError("Passphrases do not match.");
      return;
    }
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: regName,
          email: regEmail,
          password: regPassword,
          confirmPassword: regConfirmPassword,
          connection_type: regConnectionType
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || "Registration process failed.");
      } else {
        if (data.token) {
          localStorage.setItem("ecowatt_token", data.token);
        }
        setAuthSuccess("Account created! Logging in...");
        setTimeout(() => {
          setCurrentUser(data.user);
          // clear
          setRegName("");
          setRegEmail("");
          setRegPassword("");
          setRegConfirmPassword("");
        }, 1000);
      }
    } catch (err) {
      setAuthError("Network communication failure.");
    }
  };

  const handleLogout = async () => {
    try {
      await authFetch("/api/auth/logout", { method: "POST" });
      localStorage.removeItem("ecowatt_token");
      setCurrentUser(null);
      setActiveTab("dashboard");
    } catch (err) {
      console.error("Logout issue:", err);
    }
  };

  const handleDownloadPDF = async () => {
    if (!selectedBillForInvoice) return;
    
    const element = document.getElementById("printable_bill_invoice");
    if (!element) {
      setGlobalError("Invoice container element not found.");
      return;
    }

    setGlobalSuccess("Generating official high-fidelity PDF invoice... please wait.");
    setGlobalError("");

    // Helper to sanitize Tailwind CSS v4 OKLCH color rules into HSL/HSLA
    const sanitizeStylesheets = async () => {
      const styleBackups: { element: HTMLStyleElement; text: string }[] = [];
      const linkBackups: { element: HTMLLinkElement; disabled: boolean }[] = [];
      const temporaryStyleTags: HTMLStyleElement[] = [];

      const convertOklchToHsl = (cssText: string): string => {
        return cssText.replace(
          /oklch\(\s*([0-9.%]+)\s+([0-9.%]+)\s+([0-9.%]+)(?:\s*\/\s*([0-9.%]+))?\s*\)/g,
          (match, lVal, cVal, hVal, opacityVal) => {
            let L = parseFloat(lVal);
            if (lVal.includes("%")) L = L / 100;
            
            let C = parseFloat(cVal);
            if (cVal.includes("%")) C = C / 100;
            
            let H = parseFloat(hVal);
            
            const S = Math.min(100, Math.max(0, (C / 0.4) * 100));
            const L_pct = L * 100;
            
            if (opacityVal) {
              return `hsla(${H}, ${S.toFixed(1)}%, ${L_pct.toFixed(1)}%, ${opacityVal})`;
            } else {
              return `hsl(${H}, ${S.toFixed(1)}%, ${L_pct.toFixed(1)}%)`;
            }
          }
        );
      };

      // 1. Sanitize style tags
      document.querySelectorAll("style").forEach((styleEl) => {
        if (styleEl.textContent && styleEl.textContent.includes("oklch")) {
          styleBackups.push({ element: styleEl, text: styleEl.textContent });
          styleEl.textContent = convertOklchToHsl(styleEl.textContent);
        }
      });

      // 2. Sanitize and replace linked stylesheets to prevent parser crashes
      const links = Array.from(document.querySelectorAll("link[rel='stylesheet']")) as HTMLLinkElement[];
      for (const link of links) {
        try {
          const response = await fetch(link.href);
          if (response.ok) {
            const cssText = await response.text();
            if (cssText.includes("oklch")) {
              const tempStyle = document.createElement("style");
              tempStyle.textContent = convertOklchToHsl(cssText);
              document.head.appendChild(tempStyle);
              temporaryStyleTags.push(tempStyle);

              linkBackups.push({ element: link, disabled: link.disabled });
              link.disabled = true;
            }
          }
        } catch (err) {
          console.warn("Could not sanitize link stylesheet:", link.href, err);
          linkBackups.push({ element: link, disabled: link.disabled });
          link.disabled = true;
        }
      }

      return {
        restore: () => {
          styleBackups.forEach(({ element: el, text }) => {
            el.textContent = text;
          });
          linkBackups.forEach(({ element: el, disabled }) => {
            el.disabled = disabled;
          });
          temporaryStyleTags.forEach((tag) => {
            if (tag.parentNode) tag.parentNode.removeChild(tag);
          });
        }
      };
    };

    // Back up and modify styles of the element and all its parent elements up to body
    const styleBackups: { element: HTMLElement; style: string }[] = [];
    let current: HTMLElement | null = element;
    while (current && current !== document.body) {
      styleBackups.push({
        element: current,
        style: current.getAttribute("style") || "",
      });
      current = current.parentElement;
    }

    let sanitizerResult: any = null;

    try {
      // 1. Sanitize stylesheets containing OKLCH values
      sanitizerResult = await sanitizeStylesheets();

      // 2. Temporarily remove max-height and overflow: auto to let the element expand to its full natural height.
      styleBackups.forEach(({ element: el }) => {
        el.style.setProperty("max-height", "none", "important");
        el.style.setProperty("height", "auto", "important");
        el.style.setProperty("overflow", "visible", "important");
        el.style.setProperty("overflow-y", "visible", "important");
      });

      // Maintain clean 800px width aspect ratio for invoice print
      element.style.setProperty("width", "800px", "important");

      const scrollWidth = element.scrollWidth;
      const scrollHeight = element.scrollHeight;

      // 3. Capture using html2canvas with requested parameters
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        scrollX: 0,
        scrollY: 0,
        windowWidth: scrollWidth,
        windowHeight: scrollHeight,
        backgroundColor: "#ffffff",
      });

      // 4. Generate the PDF
      const pdf = new jsPDF("p", "mm", "a4");
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      // Add first page
      pdf.addImage(canvas, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add additional pages if it exceeds one page
      while (heightLeft > 0) {
        position -= pageHeight;
        pdf.addPage();
        pdf.addImage(canvas, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Name the PDF cleanly: Invoice_<ConsumerID>_<MonthNameYear>.pdf
      const consumerId = selectedBillForInvoice.consumer_id || currentUser?.consumer_id || "ECW10001";
      const [year, month] = selectedBillForInvoice.month.split("-");
      const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ];
      const monthIdx = parseInt(month, 10) - 1;
      const monthName = monthIdx >= 0 && monthIdx < 12 ? monthNames[monthIdx] : "";
      const monthYearStr = `${monthName}${year}`;
      const cleanFileName = `Invoice_${consumerId}_${monthYearStr}.pdf`;

      pdf.save(cleanFileName);

      // Reset loading banner and show success message
      setGlobalSuccess("Invoice downloaded successfully.");
      setGlobalError("");
    } catch (err) {
      console.error("PDF generation error:", err);
      setGlobalError("An error occurred during high-fidelity PDF generation. Opening browser print panel as fallback...");
      setGlobalSuccess("");
      setTimeout(() => {
        handlePrint();
        setGlobalError("");
      }, 1500);
    } finally {
      // 5. Always restore styles in finally block
      styleBackups.forEach(({ element: el, style }) => {
        if (style) {
          el.setAttribute("style", style);
        } else {
          el.removeAttribute("style");
        }
      });

      if (sanitizerResult && typeof sanitizerResult.restore === "function") {
        sanitizerResult.restore();
      }
    }
  };

  const handleUpdateConnection = async (userId: string, newType: string) => {
    try {
      setGlobalSuccess("");
      setGlobalError("");
      const res = await authFetch(`/api/admin/users/${userId}/connection`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connection_type: newType })
      });
      if (!res.ok) {
        setGlobalError("Failed to update connection category.");
      } else {
        setGlobalSuccess("Consumer connection category updated successfully.");
        loadTabData();
        if (adminSelectedConsumer && adminSelectedConsumer.id === userId) {
          setAdminSelectedConsumer((prev: any) => prev ? { ...prev, connection_type: newType } : null);
        }
      }
    } catch (err) {
      setGlobalError("Failed to edit category.");
    }
  };

  // Appliance Operations
  const handleSaveAppliance = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalError("");
    setGlobalSuccess("");

    if (!appName || appWattage <= 0) {
      setGlobalError("Appliance name and valid positive wattage are required.");
      return;
    }

    if (appDailyHours < 0 || appDailyHours > 24) {
      setGlobalError("Average daily usage hours must be between 0 and 24.");
      return;
    }

    try {
      const isEdit = !!editingAppliance;
      const url = isEdit ? `/api/appliances/${editingAppliance.id}` : "/api/appliances";
      const method = isEdit ? "PUT" : "POST";

      const res = await authFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appliance_name: appName,
          category: appCategory,
          wattage: Number(appWattage),
          average_daily_hours: Number(appDailyHours)
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setGlobalError(data.error || "Save appliance error");
      } else {
        setGlobalSuccess(isEdit ? "Appliance configuration saved successfully." : "New Appliance added successfully.");
        setApplianceModalOpen(false);
        setEditingAppliance(null);
        resetApplianceForm();
        loadTabData();
      }
    } catch (err) {
      setGlobalError("Failed to store appliance configuration settings.");
    }
  };

  const handleEditClick = (app: Appliance) => {
    setEditingAppliance(app);
    setAppName(app.appliance_name);
    setAppCategory(app.category);
    setAppWattage(app.wattage);
    setAppDailyHours(app.average_daily_hours !== undefined ? app.average_daily_hours : 4);
    setApplianceModalOpen(true);
  };

  const handleDeleteAppliance = (app: Appliance) => {
    setApplianceToDelete(app);
    setDeleteApplianceConfirmOpen(true);
  };

  const confirmDeleteAppliance = async () => {
    if (!applianceToDelete) return;
    setGlobalError("");
    setGlobalSuccess("");
    try {
      const res = await authFetch(`/api/appliances/${applianceToDelete.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setGlobalError(data.error || "Unable to delete appliance.");
      } else {
        setGlobalSuccess("Appliance deleted successfully.");
        
        // Remove the appliance card from the UI immediately after deletion
        setAppliances((prev) => prev.filter((a) => a.id !== applianceToDelete.id));
        
        // Refresh all tab data and dashboard statistics in the background
        await loadTabData();
      }
    } catch (err) {
      setGlobalError("Unable to delete appliance.");
    } finally {
      setDeleteApplianceConfirmOpen(false);
      setApplianceToDelete(null);
    }
  };

  const handleAddPreset = async (preset: { name: string; category: string; wattage: number; hours: number }) => {
    try {
      const res = await authFetch("/api/appliances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appliance_name: preset.name,
          category: preset.category,
          wattage: preset.wattage,
          average_daily_hours: preset.hours
        })
      });
      if (res.ok) {
        setGlobalSuccess("Appliance Added Successfully");
        loadTabData();
      } else {
        const error = await res.json();
        setGlobalError(error.error || "Failed to add preset.");
      }
    } catch (e) {
      setGlobalError("Failed to add preset.");
    }
  };

  const resetApplianceForm = () => {
    setAppName("");
    setAppCategory("Cooling");
    setAppWattage(120);
    setAppDailyHours(4);
  };

  // Usage Tracker Log actions
  const handleLogUsage = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalError("");
    setGlobalSuccess("");

    if (!usgApplianceId) {
      setGlobalError("Please select a registered appliance first.");
      return;
    }
    if (usgHours <= 0 || usgHours > 24) {
      setGlobalError("Hours used must be greater than zero and up to 24.");
      return;
    }
    
    try {
      const res = await authFetch("/api/usage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appliance_id: usgApplianceId,
          hours_used: Number(usgHours),
          usage_date: usgDate
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setGlobalError(data.error || "Usage failed to log.");
      } else {
        setGlobalSuccess("Electricity consumption registered successfully.");
        setUsgHours(2);
        loadTabData();
      }
    } catch (err) {
      setGlobalError("Network failed to complete usage telemetry log.");
    }
  };

  const handleDeleteUsage = async (id: string) => {
    setGlobalError("");
    setGlobalSuccess("");
    try {
      const res = await authFetch(`/api/usage/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setGlobalError(data.error || "Failed to remove usage log.");
      } else {
        setGlobalSuccess("Consumption log removed successfully.");
        loadTabData();
      }
    } catch (err) {
      setGlobalError("Failed to delete usage log.");
    }
  };

  // Billing Actions
  const handleToggleBillPaid = async (billId: string, currentStatus: string) => {
    setGlobalError("");
    setGlobalSuccess("");
    try {
      const res = await authFetch(`/api/bills/${billId}/pay`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payment_status: "Awaiting Verification" })
      });
      const data = await res.json();
      if (!res.ok) {
        setGlobalError(data.error || "Payment submission failed.");
      } else {
        setGlobalSuccess(`Payment submitted successfully. Awaiting administrator verification.`);
        loadTabData();
      }
    } catch (err) {
      setGlobalError("Failed to submit payment.");
    }
  };

  // Administrator Actions (Phase 9)
  const handleAdminGenerateBills = async () => {
    setGlobalError("");
    setGlobalSuccess("");
    try {
      const res = await authFetch("/api/admin/bills/generate", {
        method: "POST"
      });
      const data = await res.json();
      if (!res.ok) {
        setGlobalError(data.error || "Failed to trigger automatic billing cycles.");
      } else {
        setGlobalSuccess(`Successfully initialized billing calculations! ${data.message || "All consumer statement ledgers generated."}`);
        loadTabData();
      }
    } catch (err) {
      setGlobalError("Failed to trigger automated utility ledger computations.");
    }
  };

  const handleAdminPayBill = async (billId: string) => {
    setGlobalError("");
    setGlobalSuccess("");
    try {
      const res = await authFetch(`/api/admin/bills/${billId}/pay`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payment_status: "Paid", payment_date: adminMarkPaidDate })
      });
      const data = await res.json();
      if (!res.ok) {
        setGlobalError(data.error || "Failed to mark bill as settled.");
      } else {
        setGlobalSuccess("Payment authorized successfully.");
        setAdminSelectedBillForDetails(null);
        loadTabData();
      }
    } catch (err) {
      setGlobalError("Failed to issue utility authorization credit sequence.");
    }
  };

  const handleAdminRejectBill = async (billId: string) => {
    setGlobalError("");
    setGlobalSuccess("");
    try {
      const res = await authFetch(`/api/admin/bills/${billId}/reject`, {
        method: "PUT"
      });
      const data = await res.json();
      if (!res.ok) {
        setGlobalError(data.error || "Failed to reject payment.");
      } else {
        setGlobalSuccess("Payment rejected.");
        setAdminSelectedBillForDetails(null);
        loadTabData();
      }
    } catch (err) {
      setGlobalError("Failed to reject payment.");
    }
  };

  const handleAdminMarkOverdue = async (billId: string) => {
    setGlobalError("");
    setGlobalSuccess("");
    try {
      const res = await authFetch(`/api/admin/bills/${billId}/overdue`, {
        method: "POST"
      });
      const data = await res.json();
      if (!res.ok) {
        setGlobalError(data.error || "Failed to flag bill as overdue.");
      } else {
        setGlobalSuccess("Successfully marked bill as overdue and applied late penalty fee!");
        loadTabData();
      }
    } catch (err) {
      setGlobalError("Failed to flag bill status as overdue.");
    }
  };

  // Helpers for Chart.js / Recharts transformations
  const getLineChartData = () => {
    const dailyMap: Record<string, number> = {};
    const last7Days: string[] = [];
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const str = d.toISOString().substring(0, 10);
      last7Days.push(str);
      dailyMap[str] = 0;
    }

    usageLogs.forEach((u) => {
      if (u.usage_date in dailyMap) {
        dailyMap[u.usage_date] = Number((dailyMap[u.usage_date] + u.units).toFixed(2));
      }
    });

    return last7Days.map((date) => {
      const formattedDate = new Date(date).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric"
      });
      return {
        dateName: formattedDate,
        Units: dailyMap[date]
      };
    });
  };

  const getApplianceWiseChartData = () => {
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    if (appliances.length === 0) return [];
    
    return appliances.map((app) => {
      const matchingLogs = usageLogs.filter(u => u.appliance_id === app.id);
      let units = 0;
      if (matchingLogs.length > 0) {
        units = matchingLogs.reduce((sum, u) => sum + u.units, 0);
      } else {
        units = ((app.wattage * (app.average_daily_hours || 4)) / 1000) * daysInMonth;
      }
      return {
        name: app.appliance_name,
        Units: Number(units.toFixed(2))
      };
    });
  };

  const getPieChartData = () => {
    const categoryMap: Record<string, number> = {};
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    
    if (usageLogs.length > 0) {
      usageLogs.forEach((u) => {
        const cat = u.category || "General";
        categoryMap[cat] = Number(((categoryMap[cat] || 0) + u.units).toFixed(2));
      });
    } else if (appliances.length > 0) {
      appliances.forEach((a) => {
        const cat = a.category || "General";
        const estUnits = ((a.wattage * (a.average_daily_hours || 4)) / 1000) * daysInMonth;
        categoryMap[cat] = Number(((categoryMap[cat] || 0) + estUnits).toFixed(2));
      });
    } else {
      categoryMap["N/A"] = 0;
    }

    const colors = ["#0284c7", "#22c55e", "#ef4444", "#eab308", "#a855f7", "#ec4899", "#f97316"];
    return Object.keys(categoryMap).map((cat, index) => {
      return {
        name: cat,
        value: categoryMap[cat],
        color: colors[index % colors.length]
      };
    });
  };

  const getMonthlyBillBreakdownData = () => {
    if (bills.length === 0) return [];
    
    return bills.slice().reverse().map((b) => {
      const dateParts = b.month.split("-");
      const d = new Date(Number(dateParts[0]), Number(dateParts[1]) - 1, 1);
      const displayStr = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      return {
        month: displayStr,
        Bill: b.estimated_amount,
        Units: Number(b.total_units.toFixed(2))
      };
    });
  };

  // Layout Category Icons
  const grabCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case "cooling":
        return <ThermometerSnowflake className="w-4 h-4 text-sky-500" />;
      case "heating":
        return <Zap className="w-4 h-4 text-amber-500" />;
      case "entertainment":
        return <Tv className="w-4 h-4 text-purple-500" />;
      case "lighting":
        return <Lightbulb className="w-4 h-4 text-emerald-500" />;
      case "computing":
        return <Cpu className="w-4 h-4 text-indigo-500" />;
      default:
        return <Fan className="w-4 h-4 text-slate-500" />;
    }
  };

  // Loading indicator for splash view
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center items-center">
        <div className="animate-spin mb-4 text-emerald-400">
          <RefreshCw className="w-12 h-12" id="spinner" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white mb-2">EcoWatt Loading</h1>
        <p className="text-slate-400 text-sm">Synchronizing parameters & telemetry grid...</p>
      </div>
    );
  }

  // Not Logged In screen (Login & Register layout)
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 selection:bg-emerald-500 selection:text-slate-950 relative overflow-hidden">
        {/* Decorative Grid Mesh */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-950 to-slate-950 pointer-events-none" />
        
        <div className="w-[1024px] max-w-full bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row z-10" id="login_card">
          
          {/* Aesthetic Promo Info Rail (Left side) */}
          <div className="md:w-1/2 p-12 bg-gradient-to-br from-slate-900 to-slate-950 text-white flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-800">
            <div className="space-y-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <Zap className="w-6 h-6 text-slate-900" />
                </div>
                <span className="text-2xl font-bold tracking-tight font-display text-white">EcoWatt</span>
              </div>
              <div className="space-y-4">
                <h2 className="text-3xl font-black font-display leading-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-sky-450 to-emerald-400">
                  Smart Electricity Management Platform
                </h2>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Analyze real-time wattage consumption parameters, estimate utility tariffs instantly, minimize carbon footprint metrics, and optimize your budget.
                </p>
              </div>
            </div>

            <div className="mt-12 space-y-4">
              <div className="flex items-center space-x-3 bg-emerald-500/5 p-4 rounded-2xl border border-emerald-500/10">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center font-bold text-emerald-400 text-sm">💡</div>
                <div className="text-xs text-slate-300">
                  <strong className="text-white block font-bold uppercase tracking-wider text-[10px] text-emerald-400">Instant Tariffs</strong>
                  Tariffs calculated @ ₹7 flat rate per unit of electricity with interactive real-time projection curves.
                </div>
              </div>
              
              <p className="text-slate-500 text-[11px] text-center md:text-left">
                Developed for ecological optimization & energy analytics.
              </p>
            </div>
          </div>

          {/* Form Side (Right side) */}
          <div className="md:w-1/2 p-12 bg-slate-900/50 flex flex-col justify-center">
            <div className="max-w-sm mx-auto w-full">
              
              {/* Tabs */}
              <div className="flex space-x-2 bg-slate-950 p-1 rounded-xl mb-8">
                <button
                  id="tab_login"
                  onClick={() => { setAuthView("login"); setAuthError(""); setAuthSuccess(""); }}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                    authView === "login"
                      ? "bg-slate-800 text-white shadow-md shadow-emerald-500/5"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Account Login
                </button>
                <button
                  id="tab_register"
                  onClick={() => { setAuthView("register"); setAuthError(""); setAuthSuccess(""); }}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                    authView === "register"
                      ? "bg-slate-800 text-white shadow-md shadow-emerald-500/5"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Create Account
                </button>
              </div>

              {authError && (
                <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-start space-x-2" id="auth_error">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{authError}</span>
                </div>
              )}

              {authSuccess && (
                <div className="mb-6 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-start space-x-2" id="auth_success">
                  <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{authSuccess}</span>
                </div>
              )}

              {authView === "login" ? (
                /* LOGIN FORM */
                <form onSubmit={handleLogin} className="space-y-5" id="form_login">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Registered Email Address</label>
                    <input
                      type="email"
                      required
                      placeholder="alexander@domain.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Security Password</label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-medium"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 py-3.5 px-4 rounded-xl text-xs font-bold tracking-wide uppercase transition-all shadow-lg hover:shadow-emerald-500/10 hover:translate-y-[-1px] cursor-pointer mt-2"
                  >
                    Authenticate Now & Access Dashboard
                  </button>
                </form>
              ) : (
                /* REGISTER FORM */
                <form onSubmit={handleRegister} className="space-y-4" id="form_register">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="Alexander Smith"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Email Address</label>
                    <input
                      type="email"
                      required
                      placeholder="alexander@domain.com"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">MSEDCL Connection Category</label>
                    <select
                      value={regConnectionType}
                      onChange={(e) => setRegConnectionType(e.target.value as any)}
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-medium"
                    >
                      <option value="Residential">Residential (Tariff: ₹7/unit)</option>
                      <option value="Commercial">Commercial (Tariff: ₹9/unit)</option>
                      <option value="Industrial">Industrial (Tariff: ₹11/unit)</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Password</label>
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Confirm</label>
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        value={regConfirmPassword}
                        onChange={(e) => setRegConfirmPassword(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-medium"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 py-3 px-4 rounded-xl text-xs font-bold tracking-wide uppercase transition-all shadow-lg hover:shadow-emerald-500/10 cursor-pointer mt-4"
                  >
                    Register Account & Connect
                  </button>
                </form>
              )}

              <div className="mt-8 text-center">
                <p className="text-slate-500 text-xs">
                  {authView === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
                  <button
                    onClick={() => {
                      setAuthView(authView === "login" ? "register" : "login");
                      setAuthError("");
                      setAuthSuccess("");
                    }}
                    className="text-emerald-400 hover:text-emerald-300 font-bold underline"
                  >
                    {authView === "login" ? "Create one free" : "Access your logs"}
                  </button>
                </p>
              </div>

            </div>
          </div>

        </div>
      </div>
    );
  }

  // Logged-in Navigation Sidebar Layout with "High Density" aesthetic format
  return (
    <div className="flex w-full min-h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden select-none">
      
      {/* SIDEBAR NAVIGATION AREA */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col flex-shrink-0 shadow-xl" id="sidebar">
        
        {/* BRAND IDENTITY */}
        <div className="p-6 flex items-center space-x-3">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shadow-md">
            <svg className="w-5 h-5 text-slate-900" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd"></path>
            </svg>
          </div>
          <span className="text-xl font-bold tracking-tight font-display">EcoWatt</span>
        </div>

        {/* NAVIGATION LINKS */}
        <nav className="flex-1 px-4 py-2 space-y-1">
          {currentUser?.role === "admin" ? (
            <>
              <button
                onClick={() => setActiveTab("admin-dashboard")}
                id="nav_admin_dashboard"
                className={`w-full flex items-center space-x-3 p-3 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  activeTab === "admin-dashboard"
                    ? "bg-slate-800 text-emerald-400"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }`}
              >
                <Shield className="w-4 h-4 text-emerald-400" />
                <span>Admin Dashboard</span>
              </button>

              <button
                onClick={() => setActiveTab("admin-bills")}
                id="nav_admin_bills"
                className={`w-full flex items-center space-x-3 p-3 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  activeTab === "admin-bills"
                    ? "bg-slate-800 text-emerald-400"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }`}
              >
                <FileText className="w-4 h-4 text-emerald-400" />
                <span>Bill Management</span>
              </button>

              <button
                onClick={() => setActiveTab("admin-analytics")}
                id="nav_admin_analytics"
                className={`w-full flex items-center space-x-3 p-3 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  activeTab === "admin-analytics"
                    ? "bg-slate-800 text-emerald-400"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }`}
              >
                <Briefcase className="w-4 h-4 text-emerald-400" />
                <span>Revenue Analytics</span>
              </button>

              <button
                onClick={() => setActiveTab("profile")}
                id="nav_profile"
                className={`w-full flex items-center space-x-3 p-3 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  activeTab === "profile"
                    ? "bg-slate-800 text-emerald-400"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }`}
              >
                <UserIcon className="w-4 h-4 text-emerald-400" />
                <span>Admin Profile</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setActiveTab("dashboard")}
                id="nav_dashboard"
                className={`w-full flex items-center space-x-3 p-3 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  activeTab === "dashboard"
                    ? "bg-slate-800 text-emerald-400"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }`}
              >
                <Activity className="w-4 h-4 text-emerald-400" />
                <span>Dashboard</span>
              </button>

              <button
                onClick={() => setActiveTab("appliances")}
                id="nav_appliances"
                className={`w-full flex items-center space-x-3 p-3 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  activeTab === "appliances"
                    ? "bg-slate-800 text-emerald-400"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }`}
              >
                <Tv className="w-4 h-4 text-emerald-400" />
                <span>Appliances</span>
              </button>

              <button
                onClick={() => setActiveTab("usage")}
                id="nav_usage"
                className={`w-full flex items-center space-x-3 p-3 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  activeTab === "usage"
                    ? "bg-slate-800 text-emerald-400"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }`}
              >
                <Clock className="w-4 h-4 text-emerald-400" />
                <span>Usage Tracking</span>
              </button>

              <button
                onClick={() => setActiveTab("analytics")}
                id="nav_analytics"
                className={`w-full flex items-center space-x-3 p-3 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  activeTab === "analytics"
                    ? "bg-slate-800 text-emerald-400"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }`}
              >
                <PieChartIcon className="w-4 h-4 text-emerald-400" />
                <span>Energy Analytics</span>
              </button>

              <button
                onClick={() => setActiveTab("bills")}
                id="nav_bills"
                className={`w-full flex items-center space-x-3 p-3 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  activeTab === "bills"
                    ? "bg-slate-800 text-emerald-400"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }`}
              >
                <CreditCard className="w-4 h-4 text-emerald-400" />
                <span>Bill History</span>
              </button>

              <button
                onClick={() => setActiveTab("profile")}
                id="nav_profile"
                className={`w-full flex items-center space-x-3 p-3 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  activeTab === "profile"
                    ? "bg-slate-800 text-emerald-400"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }`}
              >
                <UserIcon className="w-4 h-4 text-emerald-400" />
                <span>User Profile</span>
              </button>
            </>
          )}
        </nav>

        {/* BOTTOM ECO TIP AREA */}
        <div className="p-6 border-t border-slate-800" id="sidebar_bottom_panel">
          <div className="bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/20">
            <p className="text-xs text-emerald-400 font-bold uppercase mb-1">Eco Tip</p>
            <p className="text-xs text-slate-300">
              Unplug devices during peak hours to save ₹150/mo.
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-2 mt-4 py-2 px-3 border border-slate-850 hover:bg-rose-950/40 text-rose-400 rounded-lg text-xs font-semibold tracking-wide transition-all uppercase cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5 font-bold" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* HEADER & CONTAINER CONTENT */}
      <main className="flex-1 flex flex-col min-w-0" id="main_content_rail">
        
        {/* GLOBAL TELEMETRY HEADER */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 text-slate-800 flex-shrink-0 shadow-sm" id="header">
          <div className="flex flex-col">
            <h1 className="text-lg font-bold text-slate-800 font-display">
              Healthy Day, {currentUser.name}
            </h1>
            <p className="text-[11px] text-slate-500 font-medium">
              Logged in: {currentUser.email} • {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>

          <div className="flex items-center space-x-4">
            {/* Live Grid Status */}
            <div className="flex items-center space-x-2 text-xs bg-slate-100 px-3 py-1.5 rounded-full font-semibold text-slate-600">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              <span>Grid Voltage: {liveGridStatus} (Normal)</span>
            </div>

            <div className="w-10 h-10 bg-emerald-150 rounded-full flex items-center justify-center border-2 border-emerald-400 shadow-sm font-black text-xs text-emerald-800">
              {currentUser.name.substring(0, 2).toUpperCase()}
            </div>
          </div>
        </header>

        {/* MAIN BODY SCROLL AREA */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">

          {/* Feedback Area */}
          {globalError && (
            <div className="p-4 rounded-xl bg-orange-100 border border-orange-200 text-orange-950 text-xs flex items-center justify-between" id="alert_error">
              <span className="font-semibold">{globalError}</span>
              <button onClick={() => setGlobalError("")} className="hover:text-orange-905 p-1"><X className="w-4 h-4" /></button>
            </div>
          )}

          {globalSuccess && (
            <div className="p-4 rounded-xl bg-green-100 border border-green-200 text-green-950 text-xs flex items-center justify-between animate-fadeIn" id="alert_success">
              <span className="font-semibold">{globalSuccess}</span>
              <button onClick={() => setGlobalSuccess("")} className="hover:text-green-905 p-1"><X className="w-4 h-4" /></button>
            </div>
          )}


          {/* TAB 1: DASHBOARD VIEW */}
          {activeTab === "dashboard" && (
            <div className="space-y-6" id="dashboard_view">

              {/* REALISTIC CONSUMER ACCOUNT BAR */}
              <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
                <div className="relative z-10 space-y-1">
                  <div className="flex items-center space-x-2 flex-wrap gap-1.5">
                    <span className="bg-emerald-500 text-slate-950 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider">MSEDCL-ECOSTREAM</span>
                    <span className="bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border border-blue-500/30">{currentUser?.connection_type || "Residential"}</span>
                    <span className="text-xs text-slate-400 font-bold">Utility Account</span>
                  </div>
                  <h2 className="text-xl font-bold tracking-tight text-white flex items-center">
                    Consumer ID: <span className="text-emerald-400 font-black ml-2 font-mono">{dashboardMetrics?.consumer_id || "ECW10001"}</span>
                  </h2>
                  <p className="text-slate-400 text-xs">
                    Account Holder: <span className="text-slate-200 font-semibold">{currentUser?.name}</span> • Billing: <span className="text-slate-200 font-semibold">{dashboardMetrics?.currentBillingCycle}</span>
                  </p>
                </div>

                <div className="relative z-10 flex flex-wrap gap-4 md:gap-8 text-left">
                  <div className="border-l border-slate-800 pl-4">
                    <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider">Due Date</p>
                    <p className="text-sm font-bold text-slate-100 font-mono">
                      {dashboardMetrics?.dueDate ? new Date(dashboardMetrics.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "N/A"}
                    </p>
                  </div>

                  <div className="border-l border-slate-800 pl-4">
                    <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider">Pending Outstandings</p>
                    <p className="text-sm font-bold text-rose-400 font-mono">
                      ₹{dashboardMetrics?.pendingAmount ?? 0}
                    </p>
                  </div>

                  <div className="border-l border-slate-800 pl-4">
                    <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider">Carbon Footprint</p>
                    <p className="text-sm font-bold text-emerald-400 font-mono">
                      {dashboardMetrics?.carbonFootprint ?? 0} kg CO₂
                    </p>
                  </div>
                </div>

                <div className="absolute right-0 top-0 opacity-5 pointer-events-none transform translate-x-12 -translate-y-6">
                  <Shield className="w-56 h-56" />
                </div>
              </div>
              
              {dashboardMetrics?.usingEstimates && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl flex items-center space-x-3 text-xs font-semibold shadow-sm">
                  <span className="p-1.5 bg-amber-100 rounded-lg text-amber-600 block flex-shrink-0">⚠️</span>
                  <div>
                    <p className="text-amber-900 font-bold">No actual usage records found for this month.</p>
                    <p className="text-amber-700 font-normal mt-0.5">Calculations and monthly billing projections are currently based on your configured average appliance usage. Log actual hours under "Usage Tracking" to display live real-world metrics.</p>
                  </div>
                </div>
              )}

              {/* TOP GRID OVERVIEWS */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:-translate-y-0.5 transition-all">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Appliances</p>
                  <div className="flex items-baseline space-x-2">
                    <span className="text-2xl font-black text-slate-800">
                      {dashboardMetrics?.totalAppliances ?? 0}
                    </span>
                    <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Registered</span>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:-translate-y-0.5 transition-all">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Today's Usage</p>
                  <div className="flex items-baseline space-x-2">
                    <span className="text-2xl font-black text-slate-800">
                      {dashboardMetrics?.todayConsumption ?? 0}
                    </span>
                    <span className="text-xs text-emerald-600 font-semibold">kWh (Units)</span>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:-translate-y-0.5 transition-all">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Monthly Consumption</p>
                  <div className="flex items-baseline space-x-2">
                    <span className="text-2xl font-black text-slate-800">
                      {dashboardMetrics?.monthlyConsumption ?? 0}
                    </span>
                    <span className="text-xs text-blue-600 font-semibold">kWh (Units)</span>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:-translate-y-0.5 transition-all">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Efficiency Score</p>
                  <div className="flex items-baseline space-x-2">
                    <span className="text-2xl font-black text-teal-600">
                      {dashboardMetrics?.efficiencyScore ?? 100}
                    </span>
                    <span className="text-xs text-slate-400 font-bold">/ 100</span>
                  </div>
                </div>

                <div className="bg-emerald-650 p-4 rounded-xl shadow-sm text-white hover:-translate-y-0.5 transition-all relative overflow-hidden bg-emerald-600">
                  <p className="text-xs font-bold text-emerald-100 uppercase tracking-wider mb-1">Estimated Tariff</p>
                  <div className="flex items-baseline space-x-2">
                    <span className="text-2xl font-black">
                      ₹{(dashboardMetrics?.estimatedMonthlyBill ?? 0)}
                    </span>
                    <span className="text-xs text-emerald-200 font-bold uppercase">/ Month</span>
                  </div>
                  <div className="absolute top-2 right-2 opacity-10">
                    <Zap className="w-16 h-16" />
                  </div>
                </div>
              </div>


              {/* GRAPH TREND AND METRIC SLIDES */}
              <div className="grid grid-cols-12 gap-6">
                
                {/* RECHARTS DAILY LOG LINE CHART */}
                <div className="col-span-8 bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-bold text-slate-800 flex items-center text-sm uppercase tracking-wider font-display">
                      <Activity className="w-4 h-4 mr-2 text-blue-500" /> Daily Consumption Trend
                    </h2>
                    <span className="text-xs font-semibold text-slate-600 bg-slate-150 px-2 py-0.5 rounded">
                      Last 7 Active Days
                    </span>
                  </div>

                  <div className={`flex-1 w-full bg-slate-50/50 rounded-lg p-2 ${usageLogs.length === 0 ? "h-auto py-6" : "min-h-[250px]"}`}>
                    {usageLogs.length === 0 ? (
                      <div className="w-full flex flex-col justify-center items-center text-slate-400 p-4">
                        <Activity className="w-8 h-8 text-slate-350 animate-pulse mb-2" />
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">No consumption history available.</p>
                        <p className="text-slate-400 text-[10px] text-center mt-1">Please insert energy telemetry records under "Usage Tracking" to display graphs.</p>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height={240}>
                        <LineChart data={getLineChartData()} margin={{ top: 10, right: 15, left: -25, bottom: 5 }}>
                          <XAxis dataKey="dateName" tick={{ fill: '#64748b', fontSize: 10 }} />
                          <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
                          <Tooltip contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '11px', fontWeight: 'bold' }} />
                          <Line type="monotone" dataKey="Units" stroke="#0ea5e9" strokeWidth={3} dot={{ stroke: '#0284c7', strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                {/* SMART INSIGHTS PANEL */}
                <div className="col-span-4 space-y-4">
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm h-full flex flex-col justify-between">
                    <div>
                      <h2 className="font-bold text-slate-855 text-sm mb-3 uppercase tracking-wider flex items-center font-display">
                        <Sparkles className="w-4 h-4 mr-2 text-amber-500" /> Smart Energy Insights
                      </h2>
                      
                      <div className="space-y-3">
                        {smartInsights?.recommendations.map((rec, i) => (
                          <div 
                            key={i} 
                            className={`flex items-start space-x-3 p-3 rounded-lg border text-xs font-medium ${
                              i === 0 
                                ? "bg-amber-50 border-amber-100 text-amber-900" 
                                : i === 1 
                                ? "bg-emerald-50 border-emerald-100 text-emerald-900" 
                                : "bg-blue-50 border-blue-100 text-blue-900"
                            }`}
                          >
                            <span className="text-base leading-none">
                              {i === 0 ? "⚠️" : i === 1 ? "💡" : "⚡"}
                            </span>
                            <div className="text-[11px] leading-relaxed">
                              {rec}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-slate-900 p-4 rounded-xl text-white shadow-lg overflow-hidden relative mt-4 flex-shrink-0">
                      <div className="relative z-10 space-y-3">
                        <h2 className="font-bold text-[10px] uppercase text-emerald-400 tracking-wider">Carbon Footprint Impact</h2>
                        
                        <div className="grid grid-cols-2 gap-2 text-left">
                          <div>
                            <p className="text-[9px] text-slate-400 uppercase font-semibold">Total Load</p>
                            <p className="text-sm font-black text-white">{carbonMetrics?.totalUnits ?? 0} kWh</p>
                          </div>
                          <div>
                            <p className="text-[9px] text-slate-400 uppercase font-semibold">CO₂ Emissions</p>
                            <p className="text-sm font-black text-emerald-400">{carbonMetrics?.carbonEmission ?? 0} KG</p>
                          </div>
                        </div>

                        <div className="border-t border-slate-800 pt-2 space-y-1">
                          <div className="flex justify-between items-center text-[10px] text-slate-400">
                            <span>Car Miles Offset:</span>
                            <span className="font-bold text-white">~{carbonMetrics?.carMilesOffset ?? 0} miles</span>
                          </div>
                          <div className="flex justify-between items-center text-[10px] text-slate-400">
                            <span>Trees Required:</span>
                            <span className="font-bold text-emerald-400">{carbonMetrics?.treesRequired ?? 0} mature trees</span>
                          </div>
                        </div>

                        <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500" style={{ width: `${Math.min((carbonMetrics?.carbonEmission ?? 1) / 5, 100)}%` }}></div>
                        </div>
                      </div>
                      <div className="absolute -bottom-8 -right-8 w-20 h-20 bg-emerald-500/10 rounded-full blur-xl"></div>
                    </div>

                  </div>
                </div>

              </div>

              {/* RECENT APPLIANCES ACTIVITY STREAM */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <h2 className="font-bold text-slate-800 text-sm tracking-wide font-display">Recent Consumer Telemetry Logs</h2>
                  <button 
                    onClick={() => setActiveTab("usage")}
                    className="text-xs text-blue-600 font-bold hover:underline cursor-pointer"
                  >
                    Log New Metric
                  </button>
                </div>
                <div className="flex-1 overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      <tr className="border-b border-slate-100">
                        <th className="px-6 py-2.5">Appliance Name</th>
                        <th className="px-6 py-2.5">Category</th>
                        <th className="px-6 py-2.5">Usage Date</th>
                        <th className="px-6 py-2.5 text-right">Wattage</th>
                        <th className="px-6 py-2.5 text-right">Hours Used</th>
                        <th className="px-6 py-2.5 text-right">Units (kWh)</th>
                        <th className="px-6 py-2.5 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="text-xs font-semibold text-slate-600 divider-y divide-slate-100">
                      {usageLogs.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center py-8 text-slate-400 italic">
                            No logs submitted. Go to "Usage Tracking" to enter appliance activity.
                          </td>
                        </tr>
                      ) : (
                        usageLogs.slice(0, 5).map((log) => (
                          <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-3 border-b border-slate-50 text-slate-900 font-bold">
                              {log.appliance_name}
                            </td>
                            <td className="px-6 py-3 border-b border-slate-50">
                              <span className="px-2.5 py-0.5 bg-slate-100 text-slate-800 rounded-full text-[9px] font-bold uppercase tracking-wide">
                                {log.category}
                              </span>
                            </td>
                            <td className="px-6 py-3 border-b border-slate-50 text-slate-500 font-mono text-[11px]">
                              {log.usage_date}
                            </td>
                            <td className="px-6 py-3 border-b border-slate-50 text-right font-mono text-[11px]">
                              {log.wattage}W
                            </td>
                            <td className="px-6 py-3 border-b border-slate-50 text-right font-mono text-[11px]">
                              {log.hours_used} hrs
                            </td>
                            <td className="px-6 py-3 border-b border-slate-50 text-right font-bold text-emerald-600 font-mono text-[11px]">
                              {log.units.toFixed(2)} kWh
                            </td>
                            <td className="px-6 py-3 border-b border-slate-50 text-center">
                              <button
                                onClick={() => handleDeleteUsage(log.id)}
                                className="text-rose-600 hover:text-rose-900 duration-150 p-1"
                                title="Delete Log Entry"
                                id={`del_use_${log.id}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}


          {/* ------------------------------------------------------------- */}
          {/* TAB: ADMIN DASHBOARD (PHASE 8 & 10) */}
          {/* ------------------------------------------------------------- */}
          {activeTab === "admin-dashboard" && (
            <div className="space-y-6" id="admin_dashboard_view">
              {/* HEADER ROW */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-gradient-to-r from-slate-900 to-indigo-950 p-6 rounded-2xl text-white shadow-xl">
                <div className="space-y-1">
                  <span className="bg-amber-400 text-slate-950 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider">MSEDCL ADMIN PORTAL</span>
                  <h2 className="text-xl font-bold font-display">Electricity Board Admin Dashboard</h2>
                  <p className="text-xs text-slate-400">Perform direct consumer query audits, billing calculation updates, and settlement checks.</p>
                </div>
              </div>

              {/* CORE ADMIN METRICS CARDS (PHASE 8) */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Consumers</span>
                    <Users className="w-5 h-5 text-indigo-500" />
                  </div>
                  <p className="text-2xl font-black text-slate-900 font-mono">{adminMetrics?.totalConsumers ?? 0}</p>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Registered MSEDCL Users</span>
                </div>

                <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Energy Load</span>
                    <Zap className="w-5 h-5 text-amber-500" />
                  </div>
                  <p className="text-2xl font-black text-slate-900 font-mono">{(adminMetrics?.totalUnitsConsumed ?? 0).toFixed(1)} <span className="text-xs font-bold text-slate-500">kWh</span></p>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Across All Premises</span>
                </div>

                <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Utility Income</span>
                    <TrendingUp className="w-5 h-5 text-emerald-500" />
                  </div>
                  <p className="text-2xl font-black text-emerald-600 font-mono">₹{adminMetrics?.totalRevenue ?? 0}</p>
                  <span className="text-[10px] text-emerald-700 font-bold uppercase">Verified Payments</span>
                </div>

                <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Bills Generated</span>
                    <FileText className="w-5 h-5 text-blue-500" />
                  </div>
                  <p className="text-2xl font-black text-slate-900 font-mono">{adminMetrics?.totalBillsGenerated ?? 0}</p>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Active Invoices Issued</span>
                </div>
              </div>

              {/* OUTSTANDING COLLECTIONS PANELS (PHASE 8) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Pending collections card block */}
                <div className="bg-gradient-to-br from-amber-50/50 to-orange-50/35 border border-amber-200/60 p-5 rounded-xl flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-amber-200/40 mb-3">
                      <span className="text-[11px] font-black text-amber-900 uppercase tracking-wider">Unsettled Outstanding Invoices</span>
                      <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded font-mono">Pending Collection</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase font-bold">Unsettled Bills Count</p>
                        <p className="text-2xl font-black text-slate-900 font-mono">{adminMetrics?.pendingBillsCount ?? 0}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase font-bold">Pending Amount</p>
                        <p className="text-2xl font-black text-amber-700 font-mono">₹{adminMetrics?.pendingCollectionsAmount ?? 0}</p>
                      </div>
                    </div>
                  </div>
                  <div className="text-[10px] text-amber-805 leading-relaxed pt-4 italic">
                    Advisories have been issued via Email notification triggers requesting prompt compliance before late penalties accrue.
                  </div>
                </div>

                {/* Overdue collections card block */}
                <div className="bg-gradient-to-br from-rose-50/50 to-red-50/35 border border-rose-200/60 p-5 rounded-xl flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-rose-200/40 mb-3">
                      <span className="text-[11px] font-black text-rose-900 uppercase tracking-wider">Overdue Penalty Stage Outstandings</span>
                      <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded font-mono">Overdue Collection</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase font-bold">Overdue Invoices Count</p>
                        <p className="text-2xl font-black text-slate-900 font-mono">{adminMetrics?.overdueBillsCount ?? 0}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase font-bold">Overdue Amount</p>
                        <p className="text-2xl font-black text-rose-700 font-mono">₹{adminMetrics?.overdueCollectionsAmount ?? 0}</p>
                      </div>
                    </div>
                  </div>
                  <div className="text-[10px] text-rose-805 leading-relaxed pt-4 italic">
                    Includes a calibrated late fee multiplier of ₹50 or 1.5% applied dynamically at midnight billing periods.
                  </div>
                </div>

              </div>

              {/* ADMIN CONSUMERS DIRECTORY LISTING */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-display">MSEDCL Board Registered Consumers</h3>
                    <p className="text-[11px] text-slate-400">Manage rates, connection categories, appliance telemetry & financial outstanding details.</p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                    <div className="relative w-full sm:w-64">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search by Name, Email, ID..."
                        value={adminConsumerSearch}
                        onChange={(e) => setAdminConsumerSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-emerald-500 font-medium text-slate-800 focus:bg-white transition-all"
                      />
                    </div>
                    <div className="flex items-center space-x-2 w-full sm:w-auto">
                      <select
                        value={adminConsumerConnFilter}
                        onChange={(e) => setAdminConsumerConnFilter(e.target.value)}
                        className="w-full sm:w-auto px-3 py-1.5 bg-slate-55 bg-slate-100 border border-slate-200 rounded-lg text-xs outline-none focus:border-emerald-500 font-bold text-slate-700 cursor-pointer"
                      >
                        <option value="All">All Rate Classes</option>
                        <option value="Residential">Residential</option>
                        <option value="Commercial">Commercial</option>
                        <option value="Industrial">Industrial</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 font-bold text-slate-500 uppercase tracking-wider text-[9px] border-b border-slate-150">
                      <tr>
                        <th className="px-6 py-3">Consumer ID</th>
                        <th className="px-6 py-3">Consumer Identity</th>
                        <th className="px-6 py-3">Tariff Class</th>
                        <th className="px-6 py-3 text-right">Raw Units Consumed</th>
                        <th className="px-6 py-3 text-right">Outstanding Balance</th>
                        <th className="px-6 py-3 text-center">Action Control</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-650">
                      {(() => {
                        const filteredUsers = adminConsumers.filter((usr) => {
                          const sQuery = adminConsumerSearch.toLowerCase();
                          const matchesSearch = 
                            usr.name.toLowerCase().includes(sQuery) ||
                            usr.email.toLowerCase().includes(sQuery) ||
                            (usr.consumer_id && usr.consumer_id.toLowerCase().includes(sQuery));
                          const matchesFilter = adminConsumerConnFilter === "All" || usr.connection_type === adminConsumerConnFilter;
                          return matchesSearch && matchesFilter;
                        });

                        if (filteredUsers.length === 0) {
                          return (
                            <tr>
                              <td colSpan={6} className="text-center py-10 text-slate-400 italic">No matching consumers logged in EcoWatt Subdivision.</td>
                            </tr>
                          );
                        }

                        return filteredUsers.map((usr) => (
                          <tr key={usr.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-3.5 font-bold font-mono text-slate-900 text-xs text-emerald-600">
                              {usr.consumer_id || "N/A"}
                            </td>
                            <td className="px-6 py-3.5">
                              <p className="font-black text-slate-800 text-sm leading-tight">{usr.name}</p>
                              <p className="text-slate-400 text-[10px] uppercase font-semibold mt-0.5">{usr.email}</p>
                            </td>
                            <td className="px-6 py-3.5">
                              <span className={`inline-flex px-2.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${
                                usr.connection_type === "Industrial" 
                                  ? "bg-purple-50 text-purple-700 border-purple-200" 
                                  : usr.connection_type === "Commercial" 
                                  ? "bg-amber-50 text-amber-750 border-amber-200" 
                                  : "bg-blue-50 text-blue-700 border-blue-200"
                              }`}>
                                {usr.connection_type || "Residential"}
                              </span>
                            </td>
                            <td className="px-6 py-3.5 text-right font-mono font-bold text-slate-800 text-xs">
                              {(usr.units_consumed ?? 0).toFixed(1)} kWh
                            </td>
                            <td className={`px-6 py-3.5 text-right font-mono font-black text-xs ${usr.outstanding_amount > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                              ₹{usr.outstanding_amount ?? 0}
                            </td>
                            <td className="px-6 py-3.5 text-center">
                              <button
                                onClick={() => setAdminSelectedConsumer(usr)}
                                className="bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 font-bold px-3 py-1 rounded transition-colors cursor-pointer text-[10px]"
                              >
                                Drill Down Account
                              </button>
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* DRILL DOWN CONSUMER PROFILE DIALOG */}
              {adminSelectedConsumer && (
                <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
                  <div className="bg-white rounded-2xl w-full max-w-4xl border border-slate-200 shadow-2xl relative overflow-hidden flex flex-col md:max-h-[85vh]">
                    
                    {/* Header */}
                    <div className="bg-slate-900 p-5 text-white flex justify-between items-center flex-shrink-0">
                      <div className="flex items-center space-x-3">
                        <UserIcon className="w-5 h-5 text-emerald-400" />
                        <div>
                          <h3 className="text-sm font-bold uppercase tracking-wider">MSEDCL Audit Profile Info</h3>
                          <p className="text-[11px] text-slate-400 font-medium">Consumer ID: <strong className="font-mono text-emerald-400">{adminSelectedConsumer.consumer_id || "N/A"}</strong></p>
                        </div>
                      </div>
                      <button
                        onClick={() => setAdminSelectedConsumer(null)}
                        className="text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Content Area */}
                    <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
                      
                      {/* Summary Core Block */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 space-y-2">
                          <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Demographic Identity</p>
                          <p className="text-sm font-bold text-slate-800">{adminSelectedConsumer.name}</p>
                          <p className="text-slate-500 font-semibold leading-none">Email: {adminSelectedConsumer.email}</p>
                          <p className="text-slate-400 text-[10px] font-medium leading-none">Registered: {new Date(adminSelectedConsumer.created_at || Date.now()).toLocaleDateString()}</p>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 space-y-3">
                          <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Dynamic Tariff Category</p>
                          <div className="space-y-1.5">
                            <select
                              value={adminSelectedConsumer.connection_type || "Residential"}
                              onChange={(e) => handleUpdateConnection(adminSelectedConsumer.id, e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded text-xs outline-none focus:border-emerald-500 font-bold text-slate-800 transition-all cursor-pointer"
                            >
                              <option value="Residential">Residential (Tariff: ₹7/unit)</option>
                              <option value="Commercial">Commercial (Tariff: ₹9/unit)</option>
                              <option value="Industrial">Industrial (Tariff: ₹11/unit)</option>
                            </select>
                            <p className="text-[10px] text-slate-400 italic font-semibold">Recalculates subsequent automatic billing cycles immediately.</p>
                          </div>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 space-y-2 text-center md:text-left">
                          <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Financial Standing</p>
                          <p className="text-2xl font-black text-rose-600 font-mono">₹{adminSelectedConsumer.outstanding_amount ?? 0}</p>
                          <span className={`inline-flex px-2 py-0.5 rounded text-[10px] uppercase font-black ${adminSelectedConsumer.outstanding_amount > 0 ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"}`}>
                            {adminSelectedConsumer.outstanding_amount > 0 ? "With Outstanding Balance" : "Account Cleared"}
                          </span>
                        </div>
                      </div>

                      {/* Under the hood telemetry components list */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        {/* Registered Appliance Metrics */}
                        <div className="border border-slate-200 rounded-xl p-4 space-y-3">
                          <div className="flex items-center justify-between pb-2 border-b border-slate-150">
                            <span className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">Registered Terminal Hardware ({adminSelectedConsumer.appliances?.length || 0})</span>
                          </div>
                          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                            {!adminSelectedConsumer.appliances || adminSelectedConsumer.appliances.length === 0 ? (
                              <p className="text-slate-400 italic py-6 text-center">No terminal hardware logged for this consumer.</p>
                            ) : (
                              adminSelectedConsumer.appliances.map((app: any) => (
                                <div key={app.id} className="bg-slate-50 p-2.5 rounded border border-slate-100 flex items-center justify-between">
                                  <div>
                                    <p className="font-bold text-slate-800">{app.name}</p>
                                    <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 inline-block mt-0.5">{app.location || "Premises"}</span>
                                  </div>
                                  <span className="font-mono font-black text-blue-600">{app.wattage} Watts</span>
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                        {/* Bills and Invoice History */}
                        <div className="border border-slate-200 rounded-xl p-4 space-y-3">
                          <div className="flex items-center justify-between pb-2 border-b border-slate-150">
                            <span className="font-bold text-slate-800 uppercase tracking-widest text-[10px]">All Billing Cycles ({adminSelectedConsumer.bills?.length || 0})</span>
                          </div>
                          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                            {!adminSelectedConsumer.bills || adminSelectedConsumer.bills.length === 0 ? (
                              <p className="text-slate-400 italic py-6 text-center">No bills generated for this consumer.</p>
                            ) : (
                              adminSelectedConsumer.bills.map((bill: any) => (
                                <div key={bill.id} className="bg-slate-50 p-2.5 rounded border border-slate-100 flex items-center justify-between">
                                  <div>
                                    <p className="font-bold font-mono text-slate-800 text-xs">{bill.bill_number || "ECWB-GEN"}</p>
                                    <p className="text-[10px] text-slate-400 leading-none mt-1 font-semibold">Period: {getFormatMonthName(bill.month)} • Units: {bill.total_units.toFixed(1)} kWh</p>
                                  </div>
                                  <div className="text-right space-y-1">
                                    <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-black uppercase text-white ${bill.payment_status === "Paid" ? "bg-green-500" : bill.payment_status === "Overdue" ? "bg-rose-500 animate-pulse" : "bg-amber-550 bg-amber-500"}`}>{bill.payment_status}</span>
                                    <p className="font-mono font-black text-slate-800 text-[11px] mt-0.5">₹{bill.final_amount}</p>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                      </div>

                    </div>

                    {/* Footer action */}
                    <div className="bg-slate-50 p-4 border-t border-slate-200 text-right flex-shrink-0">
                      <button
                        onClick={() => setAdminSelectedConsumer(null)}
                        className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold py-2 px-6 rounded-lg transition-colors cursor-pointer text-xs"
                      >
                        Close Consumer File
                      </button>
                    </div>

                  </div>
                </div>
              )}

            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* TAB: ADMIN BILL MANAGEMENT (PHASE 9) */}
          {/* ------------------------------------------------------------- */}
          {activeTab === "admin-bills" && (
            <div className="space-y-6" id="admin_bills_view">
              
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-3 md:space-y-0 pb-4 border-b border-slate-150">
                  <div>
                    <h2 className="text-base font-bold text-slate-800 font-display">Manage All Consumer Statements & Invoices</h2>
                    <p className="text-xs text-slate-500">Filter, search, or manually settle outstandings on behalf of MSEDCL consumers.</p>
                  </div>
                  <button
                    onClick={handleAdminGenerateBills}
                    className="bg-indigo-650 hover:bg-slate-900 text-white font-black text-xs py-2 px-4 rounded-lg cursor-pointer bg-indigo-600 transition-colors shadow-sm"
                  >
                    Generate Billing Records Now
                  </button>
                </div>

                {/* Search & Filter Row */}
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                  <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search Consumer Name, ID, or Bill Number..."
                      value={adminBillSearchQuery}
                      onChange={(e) => setAdminBillSearchQuery(e.target.value)}
                      className="w-full text-xs border border-slate-200 pl-9 pr-4 py-2 rounded-lg bg-slate-50 focus:bg-white focus:ring-1 focus:ring-indigo-500 transition-all font-semibold"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Filter className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-xs font-bold text-slate-500 mr-2">Status:</span>
                    {(["All", "Pending", "Awaiting Verification", "Paid", "Overdue"] as const).map((st) => (
                      <button
                        key={st}
                        onClick={() => setAdminBillStatusFilter(st)}
                        className={`px-3 py-1 text-xs font-black rounded-lg cursor-pointer transition-colors ${
                          adminBillStatusFilter === st
                            ? "bg-slate-900 text-white"
                            : "bg-slate-100 text-slate-650 hover:bg-slate-200"
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* BILLS DIRECTORY GRID/TABLE */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                <div className="p-4 border-b border-slate-100">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-display">Live Consumer Accounts Statements List</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-50 font-bold text-slate-500 uppercase tracking-wider text-[9px] border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-3">Bill Ref</th>
                        <th className="px-6 py-3 font-semibold text-slate-800">Consumer Name (ID)</th>
                        <th className="px-6 py-3">Period</th>
                        <th className="px-6 py-3 text-right">Units</th>
                        <th className="px-6 py-3 text-right">Net Amount</th>
                        <th className="px-6 py-3 text-center">Due Date</th>
                        <th className="px-6 py-3 text-center">Taxes/Late Fees</th>
                        <th className="px-6 py-3 text-center">Status</th>
                        <th className="px-6 py-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-650">
                      {adminBills
                        .filter((b) => {
                          const matchesSearch =
                            (b.consumer_name || "").toLowerCase().includes(adminBillSearchQuery.toLowerCase()) ||
                            (b.consumer_id || "").toLowerCase().includes(adminBillSearchQuery.toLowerCase()) ||
                            (b.bill_number || "").toLowerCase().includes(adminBillSearchQuery.toLowerCase());
                          
                          const matchesFilter =
                            adminBillStatusFilter === "All" || b.payment_status === adminBillStatusFilter;

                          return matchesSearch && matchesFilter;
                        })
                        .map((bill) => {
                          return (
                            <tr key={bill.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-6 py-4 font-mono font-bold text-[11px] text-slate-700">
                                {bill.bill_number}
                              </td>
                              <td className="px-6 py-4">
                                <p className="font-bold text-slate-900 text-sm">{bill.consumer_name}</p>
                                <p className="text-[10px] text-slate-400 font-mono">ID: {bill.consumer_id}</p>
                              </td>
                              <td className="px-6 py-4 text-xs font-bold text-indigo-900">
                                {getFormatMonthName(bill.month)}
                              </td>
                              <td className="px-6 py-4 text-right font-bold text-slate-800 font-mono">
                                {bill.total_units.toFixed(2)} units
                              </td>
                              <td className="px-6 py-4 text-right font-black text-slate-950 font-mono text-sm">
                                ₹{bill.final_amount}
                              </td>
                              <td className="px-6 py-4 text-center font-mono text-[11px] text-slate-500">
                                {bill.due_date ? new Date(bill.due_date).toLocaleDateString() : "N/A"}
                              </td>
                              <td className="px-6 py-4 text-center font-mono text-[11px] text-slate-500">
                                Fixed: ₹{bill.fixed_charges} • Late Fee: <span className={bill.late_fee > 0 ? "text-rose-600 font-bold" : ""}>₹{bill.late_fee}</span>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className={`inline-flex px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                  bill.payment_status === "Paid"
                                    ? "bg-green-150 text-green-800"
                                    : bill.payment_status === "Awaiting Verification"
                                    ? "bg-cyan-100 text-cyan-800 font-bold"
                                    : bill.payment_status === "Overdue"
                                    ? "bg-rose-100 text-rose-800"
                                    : "bg-amber-100 text-amber-800"
                                }`}>
                                  {bill.payment_status}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                  <button
                                    onClick={() => setSelectedBillForInvoice(bill)}
                                    className="text-indigo-600 hover:text-indigo-805 hover:underline px-2.5 py-1 rounded border border-indigo-200 bg-indigo-50 text-[10px] font-black cursor-pointer"
                                  >
                                    View Invoice
                                  </button>
                                  {bill.payment_status !== "Paid" && (
                                    <>
                                      <button
                                        onClick={() => {
                                          setAdminSelectedBillForDetails(bill);
                                          setAdminMarkPaidDate(new Date().toISOString().substring(0, 10));
                                        }}
                                        className={`font-bold text-[10px] py-1.5 px-2.5 rounded shadow cursor-pointer transition-colors ${
                                          bill.payment_status === "Awaiting Verification"
                                            ? "bg-amber-500 hover:bg-amber-400 text-white animate-pulse"
                                            : "bg-emerald-600 hover:bg-emerald-500 text-white"
                                        }`}
                                      >
                                        Authorize Payment
                                      </button>
                                      {bill.payment_status !== "Overdue" && bill.payment_status !== "Awaiting Verification" && (
                                        <button
                                          onClick={() => handleAdminMarkOverdue(bill.id)}
                                          className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] py-1.5 px-2.5 rounded shadow cursor-pointer transition-colors"
                                        >
                                          Overdue Penalty
                                        </button>
                                      )}
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* PAYMENT HISTORY AUDIT LOG BLOCK */}
              <div className="bg-slate-900 rounded-xl border border-slate-855 p-6 text-slate-205">
                <div className="border-b border-slate-800 pb-3 mb-4 flex justify-between items-center">
                  <div className="space-y-0.5">
                    <h3 className="text-xs font-black text-emerald-400 uppercase tracking-widest">MSEDCL verified transactions log directory</h3>
                    <p className="text-[10px] text-slate-500 uppercase font-semibold">Historical audit entries of paid consumer settlements</p>
                  </div>
                  <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded font-black font-mono px-2 py-0.5">PAYMENT AUDIT VERIFIED</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300 border-collapse">
                    <thead className="text-[9px] uppercase font-bold text-slate-500 tracking-wider border-b border-slate-800 bg-slate-950/20">
                      <tr>
                        <th className="px-6 py-2.5">Payment Date</th>
                        <th className="px-6 py-2.5">Consumer Details</th>
                        <th className="px-6 py-2.5 text-right">Settled Amount</th>
                        <th className="px-6 py-2.5 text-center">Authorized By</th>
                        <th className="px-6 py-2.5 text-center">Transaction Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-semibold text-slate-450">
                      {adminPayments.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center py-6 text-slate-500 italic">No payments logged in the system.</td>
                        </tr>
                      ) : (
                        adminPayments.map((p, idx) => (
                          <tr key={idx} className="hover:bg-slate-850/40">
                            <td className="px-6 py-3 font-mono text-xs text-slate-450">
                              {new Date(p.payment_date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                            </td>
                            <td className="px-6 py-3 text-xs text-slate-350">
                              <p className="font-extrabold text-slate-200">{p.consumer_name}</p>
                              <p className="text-[10px] text-slate-500 font-mono">ID: {p.consumer_id} • Invoice: {p.bill_number} • Txn ID: {p.id}</p>
                            </td>
                            <td className="px-6 py-3 text-right text-xs font-black text-emerald-400 font-mono">
                              ₹{p.amount}
                            </td>
                            <td className="px-6 py-3 text-center text-xs text-slate-300">
                              {p.authorized_by || "System Admin"}
                            </td>
                            <td className="px-6 py-3 text-center">
                              <span className="px-2 py-0.5 bg-emerald-950/40 border border-emerald-900 text-[9px] font-black uppercase text-emerald-400 tracking-wider rounded">{p.transaction_status || "Authorized"}</span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ADMIN MARK BILL AS SETTLED DIALOG SUBMODAL */}
              {adminSelectedBillForDetails && (
                <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
                  <div className="bg-white rounded-xl border border-slate-205 max-w-sm w-full p-6 space-y-4 shadow-2xl relative text-slate-850">
                    <button
                      onClick={() => setAdminSelectedBillForDetails(null)}
                      className="absolute right-4 top-4 text-slate-400 hover:text-slate-650"
                    >
                      <X className="w-5 h-5" />
                    </button>
                    
                    <div className="space-y-1">
                      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide font-display">Consumer Payment Authorization</h3>
                      <p className="text-xs text-slate-500">Record a payment received for invoice {adminSelectedBillForDetails.bill_number}.</p>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-lg text-xs space-y-1 border border-slate-150">
                      <p className="text-slate-600 font-bold">Consumer: <span className="text-slate-800">{adminSelectedBillForDetails.consumer_name}</span></p>
                      <p className="text-slate-600 font-mono">Outstanding: <span className="font-bold text-indigo-700">₹{adminSelectedBillForDetails.final_amount}</span></p>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">Settle date:</label>
                      <input
                        type="date"
                        value={adminMarkPaidDate}
                        onChange={(e) => setAdminMarkPaidDate(e.target.value)}
                        className="w-full text-xs font-semibold border border-slate-205 p-2 rounded-lg bg-slate-50 focus:bg-white text-slate-800"
                      />
                    </div>

                    <div className="pt-2 flex flex-col gap-2">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAdminPayBill(adminSelectedBillForDetails.id)}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] py-2 px-2.5 rounded-lg shadow cursor-pointer text-center"
                        >
                          Authorize Payment
                        </button>
                        {adminSelectedBillForDetails.payment_status === "Awaiting Verification" && (
                          <button
                            onClick={() => handleAdminRejectBill(adminSelectedBillForDetails.id)}
                            className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] py-2 px-2.5 rounded-lg shadow cursor-pointer text-center"
                          >
                            Reject Payment
                          </button>
                        )}
                      </div>
                      <button
                        onClick={() => setAdminSelectedBillForDetails(null)}
                        className="w-full bg-slate-100 hover:bg-slate-200 text-slate-705 font-bold text-xs py-2 px-4 rounded-lg cursor-pointer text-center border border-slate-200"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* TAB: REVENUE ANALYTICS (PHASE 10) */}
          {/* ------------------------------------------------------------- */}
          {activeTab === "admin-analytics" && (
            <div className="space-y-6" id="admin_analytics_view">
              
              <div className="bg-white p-5 rounded-xl border border-slate-250 shadow-sm flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900 font-display">Revenue & Energy Demand Intelligence</h2>
                  <p className="text-xs text-slate-500">MSEDCL business parameters, cash collection ratios, and peak metrics.</p>
                </div>
                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full">Automated Forecasting active</span>
              </div>

              {/* Revenue Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-3.5">
                  <div className="p-2.5 bg-emerald-50 rounded-lg text-emerald-600">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400">Total Settled Revenue</p>
                    <p className="text-lg font-black text-slate-800">₹{(adminMetrics?.totalRevenue ?? 0).toLocaleString("en-IN")}</p>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-3.5">
                  <div className="p-2.5 bg-amber-50 rounded-lg text-amber-600">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400">Pending Collections</p>
                    <p className="text-lg font-black text-slate-800">₹{(adminMetrics?.pendingCollectionsAmount ?? 0).toLocaleString("en-IN")}</p>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-3.5">
                  <div className="p-2.5 bg-rose-50 rounded-lg text-rose-600">
                    <TrendingUp className="w-5 h-5 rotate-180" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400">Overdue Collections</p>
                    <p className="text-lg font-black text-slate-800">₹{(adminMetrics?.overdueCollectionsAmount ?? 0).toLocaleString("en-IN")}</p>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-3.5">
                  <div className="p-2.5 bg-indigo-50 rounded-lg text-indigo-600">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400">Total Energy Demand</p>
                    <p className="text-lg font-black text-slate-800">{(adminMetrics?.totalUnitsConsumed ?? 0).toFixed(1)} kWh</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* 1. CHART REVENUE BY MONTH */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow flex flex-col">
                  <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-4 flex items-center font-display">
                    <TrendingUp className="w-4 h-4 mr-2 text-indigo-500" /> Utility Revenue By Billing Period
                  </h3>
                  <div className={`flex-1 w-full bg-slate-50 p-2 rounded-lg ${(!adminMetrics?.revenueByMonth || adminMetrics.revenueByMonth.length === 0) ? "h-auto py-6" : "min-h-[250px]"}`}>
                    {(!adminMetrics?.revenueByMonth || adminMetrics.revenueByMonth.length === 0) ? (
                      <div className="w-full h-full flex justify-center items-center text-slate-450 italic text-xs py-8 font-bold">No consumption history available.</div>
                    ) : (
                      <ResponsiveContainer width="100%" height={240}>
                        <BarChart data={adminMetrics.revenueByMonth} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                          <XAxis dataKey="month" tickFormatter={(m) => getFormatMonthName(m).split(" ")[0]} tick={{ fill: '#475569', fontSize: 10, fontWeight: 'bold' }} />
                          <YAxis tick={{ fill: '#475569', fontSize: 10, fontWeight: 'bold' }} />
                          <Tooltip contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '11px', fontWeight: 'bold' }} />
                          <Bar dataKey="revenue" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                {/* 2. CHART UNITS BY MONTH */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow flex flex-col">
                  <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-4 flex items-center font-display">
                    <Zap className="w-4 h-4 mr-2 text-amber-500" /> Aggregated Energy Demands (Units)
                  </h3>
                  <div className={`flex-1 w-full bg-slate-50 p-2 rounded-lg ${(!adminMetrics?.revenueByMonth || adminMetrics.revenueByMonth.length === 0) ? "h-auto py-6" : "min-h-[250px]"}`}>
                    {(!adminMetrics?.revenueByMonth || adminMetrics.revenueByMonth.length === 0) ? (
                      <div className="w-full h-full flex justify-center items-center text-slate-455 italic text-xs py-8 font-bold">No consumption history available.</div>
                    ) : (
                      <ResponsiveContainer width="100%" height={240}>
                        <LineChart data={adminMetrics.revenueByMonth} margin={{ top: 10, right: 15, left: -25, bottom: 5 }}>
                          <XAxis dataKey="month" tickFormatter={(m) => getFormatMonthName(m).split(" ")[0]} tick={{ fill: '#475569', fontSize: 10, fontWeight: 'bold' }} />
                          <YAxis tick={{ fill: '#475569', fontSize: 10, fontWeight: 'bold' }} />
                          <Tooltip contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '11px', fontWeight: 'bold' }} />
                          <Line type="monotone" dataKey="units" stroke="#10b981" strokeWidth={3} dot={{ stroke: '#047857', strokeWidth: 2, r: 4 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                {/* 3. CHART COLLECTIONS PIE CHART */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow flex flex-col">
                  <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-4 flex items-center font-display">
                    <Percent className="w-4 h-4 mr-2 text-rose-500" /> Outstanding Collection Asset Mix
                  </h3>
                  <div className="flex-1 w-full bg-slate-50 p-2 rounded-lg min-h-[250px] flex items-center justify-center">
                    <ResponsiveContainer width="100%" height={240}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: "Pending", value: adminMetrics?.pendingCollectionsAmount ?? 1 },
                            { name: "Overdue", value: adminMetrics?.overdueCollectionsAmount ?? 1 }
                          ]}
                          colorKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={75}
                          fill="#8884d8"
                          label={(entry) => `${entry.name}: ₹${entry.value}`}
                        >
                          <Cell fill="#f59e0b" />
                          <Cell fill="#ef4444" />
                        </Pie>
                        <Tooltip contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '11px', fontWeight: 'bold' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* 4. TOP CONSUMERS SCORECARD TABLE (PHASE 10) */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-4 flex items-center font-display">
                      <Users className="w-4 h-4 mr-2 text-indigo-500" /> High-Demand Power Consumers
                    </h3>
                    <div className="space-y-3">
                      {(!adminMetrics?.topConsumers || adminMetrics.topConsumers.length === 0) ? (
                        <div className="text-slate-400 italic text-xs py-8 text-center">No high demand consumers indexed yet.</div>
                      ) : (
                        adminMetrics.topConsumers.slice(0, 3).map((cons, i) => (
                          <div key={i} className="flex justify-between items-center p-3 border border-slate-100 rounded-lg bg-slate-50/50">
                            <div className="space-y-0.5">
                              <p className="text-xs font-bold text-slate-900">{cons.name}</p>
                              <p className="text-[10px] text-slate-400 font-mono">ID: {cons.consumer_id}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-indigo-700 font-bold font-mono">{cons.total_units.toFixed(1)} kWh</p>
                              <p className="text-[10px] text-emerald-600 font-bold font-mono">₹{cons.amount_spent}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-400 leading-relaxed italic pt-4">
                    Targeted advisory optimization algorithms suggest high priority solar grid transitions for top consumers.
                  </div>
                </div>

              </div>

            </div>
          )}


          {/* TAB 2: APPLIANCES CRUD */}
          {activeTab === "appliances" && (
            <div className="space-y-6" id="appliances_view">
              
              <div className="flex justify-between items-center bg-white p-5 rounded-xl border border-slate-200">
                <div>
                  <h2 className="text-base font-bold text-slate-800 font-display">Manage Electrical Appliances</h2>
                  <p className="text-xs text-slate-500">Configure parameters of electrical loads active on premises.</p>
                </div>
                <button
                  onClick={() => {
                    setEditingAppliance(null);
                    resetApplianceForm();
                    setApplianceModalOpen(true);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2 px-4 rounded-lg flex items-center space-x-2 transition-all cursor-pointer shadow-sm"
                  id="btn_add_appliance"
                >
                  <Plus className="w-4 h-4" />
                  <span>Register Appliance</span>
                </button>
              </div>

              {/* APPLIANCE FORM MODAL/DRAWER */}
              {applianceModalOpen && (
                <div className="bg-white p-6 rounded-xl border border-emerald-200 shadow-md animate-fadeIn">
                  <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
                    <h3 className="font-bold text-slate-800 text-sm font-display flex items-center">
                      <Zap className="w-4 h-4 mr-2 text-emerald-500" />
                      {editingAppliance ? `Modify Appliance Parameters: ${editingAppliance.appliance_name}` : "Register New Smart Electrical Unit"}
                    </h3>
                    <button onClick={() => setApplianceModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <form onSubmit={handleSaveAppliance} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Appliance Name / Load ID</label>
                      <input
                        type="text"
                        required
                        placeholder="Inverter AC, Smart TV, Oven, etc."
                        value={appName}
                        onChange={(e) => setAppName(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-emerald-500 font-semibold"
                        id="form_app_name"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Functional Group / Category</label>
                      <select
                        value={appCategory}
                        onChange={(e) => setAppCategory(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-emerald-500 font-semibold text-slate-800"
                        id="form_app_category"
                      >
                        {presetCategories.map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Wattage load rating (W)</label>
                      <input
                        type="number"
                        required
                        min={1}
                        max={10000}
                        placeholder="e.g. 75"
                        value={appWattage}
                        onChange={(e) => setAppWattage(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-emerald-500 font-bold"
                        id="form_app_wattage"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Avg Daily Hours</label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          required
                          min={0}
                          max={24}
                          step="0.1"
                          placeholder="e.g. 4"
                          value={appDailyHours}
                          onChange={(e) => setAppDailyHours(Number(e.target.value))}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-emerald-500 font-bold"
                          id="form_app_daily_hours"
                        />
                        <button
                          type="submit"
                          className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2 px-5 rounded-lg transition-all flex-shrink-0 cursor-pointer text-center w-full"
                        >
                          {editingAppliance ? "Save" : "Add"}
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              )}

              {/* DELETE APPLIANCE CONFIRMATION DIALOG */}
              {deleteApplianceConfirmOpen && applianceToDelete && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn" id="delete_appliance_confirm_modal">
                  <div className="bg-white rounded-2xl w-full max-w-md border border-slate-200 shadow-2xl relative overflow-hidden flex flex-col p-6 space-y-6">
                    <div className="space-y-2">
                      <h3 className="text-lg font-bold text-slate-900 font-display">Delete Appliance?</h3>
                      <p className="text-sm text-slate-600">
                        Are you sure you want to delete <span className="font-bold text-slate-950">"{applianceToDelete.appliance_name}"</span>?
                      </p>
                      <p className="text-xs text-rose-600 font-semibold">This action cannot be undone.</p>
                    </div>
                    
                    <div className="flex justify-end space-x-3 pt-2">
                      <button
                        onClick={() => {
                          setDeleteApplianceConfirmOpen(false);
                          setApplianceToDelete(null);
                        }}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-5 py-2.5 rounded-lg transition-all cursor-pointer border border-slate-200"
                        id="btn_delete_appliance_cancel"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={confirmDeleteAppliance}
                        className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs px-5 py-2.5 rounded-lg shadow transition-all cursor-pointer"
                        id="btn_delete_appliance_confirm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* QUICK CATALOG PRESETS */}
              <div className="bg-white p-5 rounded-xl border border-slate-200">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Add standard presets instantly</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {standardPresets.map((preset, index) => {
                    const alreadyExists = appliances.some((a) => a.appliance_name.toLowerCase() === preset.name.toLowerCase());
                    return (
                      <button
                        key={index}
                        disabled={alreadyExists}
                        onClick={() => handleAddPreset(preset)}
                        className={`flex items-center justify-between p-3 border rounded-xl text-left transition-all ${
                          alreadyExists
                            ? "bg-slate-50 text-slate-400 border-slate-100 cursor-not-allowed"
                            : "bg-white text-slate-750 hover:bg-emerald-50 border-slate-200 hover:border-emerald-300"
                        }`}
                        id={`preset_${index}`}
                      >
                        <div>
                          <p className="text-xs font-bold text-slate-800 line-clamp-1">{preset.name}</p>
                          <p className="text-[10px] text-slate-500 font-semibold">{preset.category} • {preset.wattage}W</p>
                        </div>
                        <Plus className="w-4 h-4 text-emerald-600 flex-shrink-0 ml-2" />
                      </button>
                    );
                  })}
                </div>
              </div>


              {/* CURRENT APPLIANCES GALLERY */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="appliances_grid">
                {appliances.length === 0 ? (
                  <div className="col-span-3 text-center py-12 bg-white rounded-xl border border-slate-200 text-slate-400 p-6 flex flex-col items-center justify-center space-y-4">
                    <Tv className="w-12 h-12 text-slate-300 animate-pulse" />
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-slate-800">No appliances registered.</p>
                      <p className="text-slate-400 text-xs">Initialize appliances using preset catalog cards below or register a custom unit.</p>
                    </div>
                    <button
                      onClick={() => {
                        setEditingAppliance(null);
                        resetApplianceForm();
                        setApplianceModalOpen(true);
                      }}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2 px-4 rounded-lg flex items-center space-x-2 transition-all cursor-pointer shadow-sm mx-auto"
                      id="empty_state_register_btn"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Register Appliance</span>
                    </button>
                  </div>
                ) : (
                  appliances.map((app) => (
                    <div key={app.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden group">
                      
                      {/* Top Indicator Category */}
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center space-x-2">
                          <div className="p-2 bg-slate-100 rounded-lg">
                            {grabCategoryIcon(app.category)}
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-800 text-sm line-clamp-1">{app.appliance_name}</h4>
                            <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">{app.category}</span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex space-x-1 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleEditClick(app)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                            title="Edit Parameters"
                            id={`edit_app_${app.id}`}
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteAppliance(app)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                            title="Delete Appliance"
                            id={`del_app_${app.id}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Info load ratings */}
                      <div className="border-t border-slate-100 pt-3 flex justify-between items-center font-mono">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Power & Daily Usage</p>
                          <p className="text-sm font-black text-slate-800 font-sans">
                            {app.wattage}W <span className="text-xs font-semibold text-slate-500">• {app.average_daily_hours !== undefined ? app.average_daily_hours : 4} hrs/day</span>
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Daily Est</p>
                          <p className="text-xs font-semibold text-emerald-600">
                            {((app.wattage * (app.average_daily_hours !== undefined ? app.average_daily_hours : 4)) / 1000).toFixed(2)} kWh
                          </p>
                        </div>
                      </div>

                    </div>
                  ))
                )}
              </div>

            </div>
          )}


          {/* TAB 3: USAGE TRACKING LOGS */}
          {activeTab === "usage" && (
            <div className="grid grid-cols-12 gap-6" id="usage_view">
              
              {dashboardMetrics?.usingEstimates && (
                <div className="col-span-12 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl flex items-center space-x-3 text-xs font-semibold shadow-sm">
                  <span className="p-1.5 bg-amber-100 rounded-lg text-amber-600 block flex-shrink-0">⚠️</span>
                  <div>
                    <p className="text-amber-900 font-bold">No actual usage records found for this month.</p>
                    <p className="text-amber-700 font-normal mt-0.5">Calculations and monthly billing projections are currently based on your configured average appliance usage. This is optional; you can enter actual usage logs below to override average usage settings.</p>
                  </div>
                </div>
              )}

              {/* Form Input Section */}
              <div className="col-span-12 md:col-span-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-fit">
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-2 font-display flex items-center">
                  <Clock className="w-4 h-4 mr-2 text-emerald-600" /> Log Usage Hours
                </h2>
                <p className="text-xs text-slate-500 mb-6">Enter actual duration hours used on specific calendar dates.</p>

                <form onSubmit={handleLogUsage} className="space-y-4" id="form_usage_log">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">1. Select Appliance Unit</label>
                    <select
                      required
                      value={usgApplianceId}
                      onChange={(e) => setUsgApplianceId(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-emerald-500 font-semibold text-slate-850"
                      id="usage_appliance_selector"
                    >
                      <option value="">-- Choose active loaded unit --</option>
                      {appliances.map((app) => (
                        <option key={app.id} value={app.id}>
                          {app.appliance_name} ({app.wattage}W) [- {app.category} -]
                        </option>
                      ))}
                    </select>
                    {appliances.length === 0 && (
                      <p className="text-[10px] text-red-500 font-semibold mt-1">Please configure appliances first under "Appliances" tab.</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">2. Duration of utilization (Hours)</label>
                    <div className="flex items-center space-x-3">
                      <input
                        type="range"
                        min="0.5"
                        max="24"
                        step="0.5"
                        value={usgHours}
                        onChange={(e) => setUsgHours(Number(e.target.value))}
                        className="w-full accent-emerald-600 cursor-pointer"
                        id="usage_hours_slider"
                      />
                      <span className="w-16 text-center font-black text-sm bg-slate-900 text-white rounded px-2 py-1 font-mono">
                        {usgHours} hr
                      </span>
                    </div>
                    <div className="flex justify-between text-[9px] text-slate-400 font-bold uppercase mt-1">
                      <span>Min: 30 Mins</span>
                      <span>Max: 24 Hrs</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">3. Calendar Usage Date</label>
                    <input
                      type="date"
                      required
                      value={usgDate}
                      onChange={(e) => setUsgDate(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none font-bold text-slate-805"
                      id="usage_date_picker"
                    />
                  </div>

                  {usgApplianceId && (
                    <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 mt-2">
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Tariff Calculation Matrix:</p>
                      <div className="mt-2 text-xs font-semibold text-slate-800 space-y-1">
                        <div className="flex justify-between">
                          <span>Appload wattage:</span>
                          <span className="font-mono">
                            {appliances.find((a) => a.id === usgApplianceId)?.wattage || 0}W
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Converted units:</span>
                          <span className="font-mono text-emerald-600 font-bold">
                            {(((appliances.find((a) => a.id === usgApplianceId)?.wattage || 0) * usgHours) / 1000).toFixed(3)} Units (kWh)
                          </span>
                        </div>
                        <div className="flex justify-between border-t border-emerald-100/30 pt-1 mt-1 font-bold">
                          <span>Projected Cost (@ ₹7):</span>
                          <span className="text-slate-900 font-mono">
                            ₹{( (((appliances.find((a) => a.id === usgApplianceId)?.wattage || 0) * usgHours) / 1000) * 7 ).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={appliances.length === 0}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-3 px-4 rounded-xl cursor-pointer disabled:opacity-50 transition-all uppercase tracking-wider"
                    id="btn_submit_usage"
                  >
                    Register Energy Consumption
                  </button>
                </form>
              </div>

              {/* Logger Database Grid view */}
              <div className="col-span-12 md:col-span-8 bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-805 uppercase tracking-wider font-display">Historical utilization logs registry</h3>
                  <span className="text-xs bg-emerald-500/10 text-emerald-700 px-3 py-1 rounded-full font-bold">
                    Total: {usageLogs.length} Records
                  </span>
                </div>

                <div className="flex-1 overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-50 font-bold text-slate-500 uppercase tracking-widest text-[9px]">
                      <tr className="border-b border-slate-100">
                        <th className="px-4 py-3">Appliance</th>
                        <th className="px-4 py-3">Category</th>
                        <th className="px-4 py-3">Usage Date</th>
                        <th className="px-4 py-3 text-right">Hours Logged</th>
                        <th className="px-4 py-3 text-right">Total Units</th>
                        <th className="px-4 py-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="font-semibold text-slate-650 divide-y divide-slate-100" id="usage_table_body">
                      {usageLogs.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-12 text-slate-400 italic">
                            No utilization history found. Fill left parameters to record initial telemetry data.
                          </td>
                        </tr>
                      ) : (
                        usageLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-4 py-3 font-bold text-slate-900">
                              {log.appliance_name}
                            </td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-0.5 bg-slate-100 rounded-full font-bold text-[9px] uppercase tracking-wider text-slate-700">
                                {log.category}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-500 font-mono">
                              {log.usage_date}
                            </td>
                            <td className="px-4 py-3 text-right font-mono">
                              {log.hours_used} hrs
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-emerald-600 font-mono">
                              {log.units.toFixed(2)} kWh
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => handleDeleteUsage(log.id)}
                                className="text-rose-500 hover:text-rose-800 p-1 rounded hover:bg-rose-50 transition"
                                title="Remove item log"
                                id={`del_use_page_${log.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}


          {/* TAB 4: ENERGY ANALYTICS & CHARTS */}
          {activeTab === "analytics" && (
            <div className="space-y-6" id="analytics_view">
              
              <div className="bg-white p-5 rounded-xl border border-slate-200">
                <h2 className="text-base font-bold text-slate-808 font-display">System Consumption Analytics Console</h2>
                <p className="text-xs text-slate-500">Visual profiles mapping appliance parameters, category shares, and billing history.</p>
              </div>

              <div className="grid grid-cols-12 gap-6">

                {/* CHART 1: APPLIANCE-WISE MONTHLY CONSUMPTION */}
                <div className="col-span-12 md:col-span-8 bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest font-display mb-4 flex items-center">
                    <Activity className="w-4 h-4 mr-2 text-blue-500" /> Appliance-Wise Monthly Consumption (kWh Units)
                  </h3>
                  <div className={`bg-slate-50/50 rounded-lg p-2 ${appliances.length === 0 ? "h-auto py-8" : "h-[250px]"}`}>
                    {appliances.length === 0 ? (
                      <div className="w-full h-full flex flex-col justify-center items-center text-slate-400 text-xs py-6">
                        <Activity className="w-8 h-8 text-slate-300 animate-pulse mb-2" />
                        <p className="font-bold">No consumption history available.</p>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={getApplianceWiseChartData()}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} />
                          <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
                          <Tooltip contentStyle={{ fontSize: 11 }} />
                          <Bar dataKey="Units" fill="#0ea5e9" radius={[4, 4, 0, 0]} maxBarSize={40} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                {/* CHART 2: CATEGORY-WISE CONSUMPTION SHARE */}
                <div className="col-span-12 md:col-span-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest font-display mb-4 flex items-center">
                    <PieChartIcon className="w-4 h-4 mr-2 text-emerald-500" /> Category-Wise Consumption Share
                  </h3>
                  <div className={`bg-slate-50/50 rounded-lg p-2 flex flex-col justify-center items-center ${appliances.length === 0 && usageLogs.length === 0 ? "h-auto py-8" : "h-[250px]"}`}>
                    {appliances.length === 0 && usageLogs.length === 0 ? (
                      <div className="text-slate-400 text-xs text-center flex flex-col justify-center items-center py-6">
                        <PieChartIcon className="w-8 h-8 text-slate-300 animate-pulse mb-2" />
                        <p className="font-bold">No consumption history available.</p>
                      </div>
                    ) : (
                      <>
                        <ResponsiveContainer width="100%" height={160}>
                          <PieChart>
                            <Pie
                              data={getPieChartData()}
                              cx="50%"
                              cy="50%"
                              innerRadius={40}
                              outerRadius={65}
                              paddingAngle={4}
                              dataKey="value"
                            >
                              {getPieChartData().map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(v) => `${v} kWh`} />
                          </PieChart>
                        </ResponsiveContainer>
                        
                        {/* Legends */}
                        <div className="flex flex-wrap gap-2 justify-center mt-3 text-[9px] font-bold uppercase tracking-wider max-h-[70px] overflow-y-auto">
                          {getPieChartData().map((entry, i) => (
                            <div key={i} className="flex items-center space-x-1">
                              <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: entry.color }}></span>
                              <span className="text-slate-600">{entry.name} ({entry.value}u)</span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* CHART 3: MONTHLY BILL BREAKDOWN */}
                <div className="col-span-12 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest font-display mb-4 flex items-center">
                    <Calendar className="w-4 h-4 mr-2 text-indigo-500" /> Monthly Bill & Cost Breakdown History (₹ Tariff Amount)
                  </h3>
                  <div className={`bg-slate-50/50 rounded-lg p-2 ${bills.length === 0 ? "h-auto py-8" : "h-[220px]"}`}>
                    {bills.length === 0 ? (
                      <div className="w-full h-full flex flex-col justify-center items-center text-slate-400 text-xs py-6">
                        <Calendar className="w-8 h-8 text-slate-300 animate-pulse mb-2" />
                        <p className="font-bold">No consumption history available.</p>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={getMonthlyBillBreakdownData()}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 10 }} />
                          <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
                          <Tooltip contentStyle={{ fontSize: 11 }} />
                          <Bar dataKey="Bill" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={50} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

              </div>

            </div>
          )}


          {/* TAB 5: BILLING HISTORY AND TARIFF PAYMENTS */}
          {activeTab === "bills" && (
            <div className="space-y-6" id="bills_view">
              
              <div className="bg-gradient-to-r from-slate-900 to-slate-950 p-6 rounded-xl text-white flex flex-col md:flex-row justify-between items-start md:items-center">
                <div className="space-y-1">
                  <h2 className="text-base font-bold font-display tracking-wide">Standard Billing & Tariff Center</h2>
                  <p className="text-xs text-slate-400">Tariff formula calibrated at <span className="text-emerald-400 font-bold">₹7 per kWh unit</span>. Monthly summaries generate automatically.</p>
                </div>
                
                <div className="mt-4 md:mt-0 bg-slate-850 p-3.5 rounded-lg border border-slate-800">
                  <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Default active tariff</span>
                  <p className="text-lg font-black text-emerald-400">₹7.00 <span className="text-xs text-white">/ kWh Unit</span></p>
                </div>
              </div>

              {/* Bill Prediction Cards Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Current Month Consumption</span>
                    <div className="space-y-3">
                      <div>
                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Units Consumed:</span>
                        <p className="text-xl font-black text-slate-800 font-mono">{currentMonthUnits.toFixed(2)} kWh</p>
                      </div>
                      <div>
                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Current Bill:</span>
                        <p className="text-xl font-black text-emerald-600 font-display">₹{Math.round(currentBill)}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end mt-4 text-slate-400">
                    <Zap className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-5 rounded-xl border border-emerald-100 shadow-sm flex flex-col justify-between">
                  <div>
                    <span className="block text-[10px] font-bold text-emerald-800 uppercase tracking-widest mb-4">Estimated Monthly Bill</span>
                    <div className="space-y-3">
                      <div>
                        <span className="block text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Projected Units:</span>
                        <p className="text-xl font-black text-emerald-950 font-mono">{predictedMonthEndUnits.toFixed(2)} kWh</p>
                      </div>
                      <div>
                        <span className="block text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Projected Bill:</span>
                        <p className="text-xl font-black text-emerald-700 font-display">₹{Math.round(predictedMonthEndBill)}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end mt-4 text-emerald-600">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Average Daily Consumption</span>
                    <div className="space-y-3">
                      <div>
                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Average Daily Usage:</span>
                        <p className="text-xl font-black text-slate-800 font-mono">{avgDailyUnits.toFixed(2)} kWh/day</p>
                      </div>
                      <div>
                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Days Elapsed:</span>
                        <p className="text-xl font-black text-slate-800 font-mono">{daysPassed} Days</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end mt-4 text-indigo-500">
                    <TrendingDown className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* Bills history database summary */}
              <div className="bg-white rounded-xl border border-slate-200">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-display">MSEDCL Registered Consumer Bills</h3>
                  <span className="text-xs font-semibold text-slate-500">Auto-Generates Peak Outstandings</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-50 font-bold text-slate-500 uppercase tracking-wider text-[9px]">
                      <tr className="border-b border-slate-100">
                        <th className="px-4 py-3">Bill Number</th>
                        <th className="px-4 py-3">Billing Period</th>
                        <th className="px-4 py-3 text-right">Units</th>
                        <th className="px-4 py-3 text-right font-semibold">Taxes & Fee</th>
                        <th className="px-4 py-3 text-right">Net Amount</th>
                        <th className="px-4 py-3 text-center">Due Date</th>
                        <th className="px-4 py-3 text-center">Late Penalty</th>
                        <th className="px-4 py-3 text-center">Payment Status</th>
                        <th className="px-4 py-3 text-center">Invoice Summary</th>
                        <th className="px-4 py-3 text-center">Settlement Action</th>
                      </tr>
                    </thead>
                    <tbody className="font-semibold text-slate-650 divide-y divide-slate-100" id="bills_table_body">
                      {bills.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="text-center py-12 text-slate-400 italic">
                            No billing cycles registered yet. Log hourly appliance telemetry to automatically populate billing parameters.
                          </td>
                        </tr>
                      ) : (
                        bills.map((bill) => {
                          const displayMonth = getFormatMonthName(bill.month);
                          const formattedDueDate = bill.due_date ? new Date(bill.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "N/A";
                          const formattedPayDate = bill.payment_date ? new Date(bill.payment_date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "";
                          return (
                            <tr key={bill.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-4 py-4 font-mono font-bold text-slate-800 text-xs">
                                {bill.bill_number || "ECWB-MOCK"}
                              </td>
                              <td className="px-4 py-4 font-bold text-slate-950 text-xs">
                                {displayMonth}
                              </td>
                              <td className="px-4 py-4 text-right font-semibold text-slate-800 font-mono">
                                {bill.total_units.toFixed(1)} kWh
                              </td>
                              <td className="px-4 py-4 text-right text-slate-500 font-mono text-[11px]">
                                Fixed: ₹{bill.fixed_charges} • Duty: ₹{bill.electricity_duty}
                              </td>
                              <td className="px-4 py-4 text-right font-black text-slate-900 font-mono text-xs">
                                ₹{bill.final_amount}
                              </td>
                              <td className="px-4 py-4 text-center text-[11px] font-semibold text-slate-500 font-mono">
                                {formattedDueDate}
                              </td>
                              <td className="px-4 py-4 text-center text-rose-600 font-mono">
                                {bill.late_fee > 0 ? `₹${bill.late_fee}` : "₹0"}
                              </td>
                              <td className="px-4 py-4 text-center">
                                <span className={`inline-flex px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                  bill.payment_status === "Paid"
                                    ? "bg-green-100 text-green-800"
                                    : bill.payment_status === "Awaiting Verification"
                                    ? "bg-cyan-100 text-cyan-800"
                                    : bill.payment_status === "Overdue"
                                    ? "bg-rose-100 text-rose-800 px-3.5"
                                    : "bg-amber-100 text-amber-800 px-3.5"
                                }`}>
                                  {bill.payment_status === "Awaiting Verification" ? "Awaiting Admin Verification" : bill.payment_status}
                                </span>
                              </td>
                              <td className="px-4 py-4 text-center">
                                <button
                                  onClick={() => setSelectedBillForInvoice(bill)}
                                  className="text-emerald-600 hover:text-emerald-800 hover:underline px-2.5 py-1 rounded border border-emerald-500/10 hover:bg-emerald-50 text-[11px] font-bold cursor-pointer"
                                >
                                  View Invoice
                                </button>
                              </td>
                              <td className="px-4 py-4 text-center">
                                <button
                                  onClick={() => {
                                    if (bill.payment_status !== "Awaiting Verification" && bill.payment_status !== "Paid") {
                                      handleToggleBillPaid(bill.id, bill.payment_status);
                                    }
                                  }}
                                  id={`pay_btn_${bill.id}`}
                                  disabled={bill.payment_status === "Awaiting Verification" || bill.payment_status === "Paid"}
                                  className={`text-[10px] py-1 px-2.5 font-bold rounded transition-all border ${
                                    bill.payment_status === "Paid"
                                      ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                                      : bill.payment_status === "Awaiting Verification"
                                      ? "bg-cyan-50 text-cyan-600 border-cyan-200 cursor-not-allowed"
                                      : "bg-indigo-600 hover:bg-indigo-500 text-white border-transparent shadow cursor-pointer"
                                  }`}
                                >
                                  {bill.payment_status === "Paid" 
                                    ? "Paid" 
                                    : bill.payment_status === "Awaiting Verification" 
                                    ? "Payment Submitted" 
                                    : "Pay Now"}
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}


          {/* TAB 6: USER / ADMIN PROFILE PREFERENCES */}
          {activeTab === "profile" && currentUser && (
            <div className="max-w-4xl mx-auto space-y-6" id="profile_view">
              {currentUser.role === "admin" ? (
                <AdminProfile
                  currentUser={currentUser}
                  adminMetrics={adminMetrics}
                  adminBills={adminBills}
                  adminConsumers={adminConsumers}
                  adminPayments={adminPayments}
                  onNavigate={(tab) => setActiveTab(tab)}
                />
              ) : (
                <ConsumerProfile
                  currentUser={currentUser}
                  profileMetrics={profileMetrics}
                  carbonMetrics={carbonMetrics}
                />
              )}
            </div>
          )}

          {/* REALISTIC HIGH-FIDELITY UTILITY BILL INVOICE MODAL (PHASE 6 & 14) */}
          {selectedBillForInvoice && (
            <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto" id="invoice_modal">
              <div className="bg-white rounded-2xl w-full max-w-2xl border border-slate-200 shadow-2xl relative overflow-hidden flex flex-col md:max-h-[90vh]">
                
                {/* Modal actions panel top */}
                <div className="bg-slate-950 p-4 text-white flex justify-between items-center flex-shrink-0">
                  <div className="flex items-center space-x-2">
                    <Shield className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-300">Official Utility Invoice</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={handleDownloadPDF}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-1.5 px-3 rounded flex items-center space-x-1 transition-all cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download PDF</span>
                    </button>
                    <button
                      onClick={() => setSelectedBillForInvoice(null)}
                      className="text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded transition-all cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Printable Invoice Page area */}
                <div className="p-8 space-y-6 overflow-y-auto flex-1 text-slate-800 bg-white" id="printable_bill_invoice" ref={invoiceRef}>
                  
                  {/* Bill Header MSEDCL */}
                  <div className="flex justify-between items-start border-b-2 border-slate-900 pb-5">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
                        <span className="text-lg font-black tracking-tight text-slate-950 font-display">MAHAVITARAN</span>
                      </div>
                      <p className="text-[10px] uppercase font-black tracking-widest text-slate-500">Maharashtra State Electricity Distribution Co.</p>
                      <p className="text-[10px] text-slate-400">Office: EcoWatt Digital Subdivision Pune • Helpline: 1912</p>
                    </div>

                    <div className="text-right space-y-1">
                      <span className={`inline-block px-3 py-1 rounded text-xs font-black uppercase tracking-wider ${
                        selectedBillForInvoice.payment_status === "Paid"
                          ? "bg-green-150 text-green-800 border-2 border-green-300"
                          : selectedBillForInvoice.payment_status === "Overdue"
                          ? "bg-rose-100 text-rose-800 border-2 border-rose-300 animate-bounce"
                          : "bg-amber-100 text-amber-800 border-2 border-amber-300"
                      }`}>
                        {selectedBillForInvoice.payment_status}
                      </span>
                      <p className="text-xs text-slate-500">Bill Date: {selectedBillForInvoice.generated_at ? new Date(selectedBillForInvoice.generated_at).toLocaleDateString() : new Date().toLocaleDateString()}</p>
                    </div>
                  </div>

                  {/* Customer Information Block */}
                  <div className="grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-150 text-xs">
                    <div className="space-y-1.5 border-r border-slate-200 pr-4">
                      <p className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Consumer Details</p>
                      <p className="text-sm font-bold text-slate-900">{selectedBillForInvoice.consumer_name || currentUser?.name}</p>
                      <p className="text-slate-600">Email: {selectedBillForInvoice.consumer_email || currentUser?.email}</p>
                      <p className="text-slate-600 font-bold">Consumer ID: <span className="font-mono text-emerald-700 font-extrabold">{selectedBillForInvoice.consumer_id || currentUser?.consumer_id || "ECW10001"}</span></p>
                    </div>

                    <div className="space-y-1.5 pl-2">
                      <p className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Billing Telemetry Summary</p>
                      <p className="font-bold text-slate-900">Invoice Ref: <span className="font-mono text-slate-700">{selectedBillForInvoice.bill_number || "ECWB-MOCK"}</span></p>
                      <p className="text-slate-600">Billing Month: <span className="font-semibold text-slate-800">{getFormatMonthName(selectedBillForInvoice.month)}</span></p>
                      <p className="text-slate-600">Connection Class: Domestic Residential Single Phase</p>
                    </div>
                  </div>

                  {/* Charges Calculation Ledger */}
                  <div className="space-y-3">
                    <div className="p-1 border-b border-slate-200">
                      <h4 className="text-[11px] uppercase font-black tracking-widest text-slate-500">Consumption Calculation Breakdown</h4>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between items-center py-1.5 border-b border-dashed border-slate-100">
                        <span className="text-slate-600">Total Units Consumed (kWh)</span>
                        <span className="font-bold font-mono text-slate-800">{selectedBillForInvoice.total_units.toFixed(2)} Units</span>
                      </div>

                      <div className="flex justify-between items-center py-1.5 border-b border-dashed border-slate-100">
                        <div>
                          <span className="text-slate-600">Energy Charges</span>
                          <span className="block text-[10px] text-slate-400">({selectedBillForInvoice.total_units.toFixed(1)} units × ₹{selectedBillForInvoice.tariff_rate}/kWh standard rate)</span>
                        </div>
                        <span className="font-bold font-mono text-slate-800">₹{selectedBillForInvoice.energy_charges}</span>
                      </div>

                      <div className="flex justify-between items-center py-1.5 border-b border-dashed border-slate-100">
                        <div>
                          <span className="text-slate-600">Fixed Connection Charges</span>
                          <span className="block text-[10px] text-slate-400">Residential standard service terminal fee</span>
                        </div>
                        <span className="font-bold font-mono text-slate-800">₹{selectedBillForInvoice.fixed_charges}</span>
                      </div>

                      <div className="flex justify-between items-center py-1.5 border-b border-dashed border-slate-100">
                        <div>
                          <span className="text-slate-600">Electricity Duty Tariffs (5%)</span>
                          <span className="block text-[10px] text-slate-400">State energy safety municipal administration tax</span>
                        </div>
                        <span className="font-bold font-mono text-slate-800">₹{selectedBillForInvoice.electricity_duty}</span>
                      </div>

                      <div className="flex justify-between items-center py-1.5 border-b border-dashed border-slate-100">
                        <div>
                          <span className="text-slate-600">Late Payment Penalty Fee</span>
                          <span className="block text-[10px] text-slate-400">1.5% accrued for overdue outstandings</span>
                        </div>
                        <span className={`font-bold font-mono ${selectedBillForInvoice.late_fee > 0 ? "text-rose-600 font-black text-sm" : "text-slate-500"}`}>
                          ₹{selectedBillForInvoice.late_fee}
                        </span>
                      </div>

                      <div className="flex justify-between items-center py-4 bg-slate-900 text-white rounded-xl px-5 mt-4 shadow-lg">
                        <span className="font-bold uppercase tracking-wider text-xs">Net Final Amount Payable</span>
                        <div className="text-right">
                          <span className="text-lg font-black font-mono text-emerald-400">₹{selectedBillForInvoice.final_amount}</span>
                          <span className="block text-[9px] text-slate-400 font-semibold uppercase tracking-wider">Duties Inclusive</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Due Date & QR placeholder (PHASE 6) */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-5 border-t border-slate-200">
                    <div className="md:col-span-8 text-xs space-y-3">
                      <div className="space-y-1 bg-amber-50 border border-amber-100 p-3 rounded-lg text-[11px] text-amber-900">
                        <p className="font-black">⚠️ UTILITY ADVISORY TIMESTAMPS:</p>
                        <p>Prompt settlement on or before <strong className="text-rose-800 font-mono font-black">{selectedBillForInvoice.due_date ? new Date(selectedBillForInvoice.due_date).toLocaleDateString() : "N/A"}</strong> prevents the accumulation of regulatory late penalties (₹50 flat or 1.5% index).</p>
                        {selectedBillForInvoice.payment_status === "Paid" && (
                          <p className="text-emerald-800 font-bold mt-1">✓ PAID SETTLED STAMP: Confirmed payment recorded on {selectedBillForInvoice.payment_date ? new Date(selectedBillForInvoice.payment_date).toLocaleDateString() : "N/A"}. Thank you.</p>
                        )}
                      </div>

                      <div className="text-[10px] text-slate-400 leading-relaxed pt-2">
                        This is an automatically generated system electronic receipt calibrated in compliance with standard utility pricing frameworks of Mahavitaran/MSEDCL and EcoWatt. Offline duplicates are available at subdivisions.
                      </div>
                    </div>

                    {/* QR Code Graphic Representation */}
                    <div className="md:col-span-4 flex flex-col justify-center items-center text-center p-3 border border-slate-200 rounded-xl bg-slate-50">
                      <div className="w-24 h-24 bg-white border border-slate-300 p-1 rounded-lg flex flex-col justify-between overflow-hidden relative shadow-inner">
                        {/* Mock QR graphic using simple HTML elements */}
                        <div className="grid grid-cols-5 gap-0.5 h-full opacity-90 p-0.5">
                          {Array.from({ length: 25 }).map((_, i) => (
                            <div 
                              key={i} 
                              className={`h-full w-full rounded-sm ${
                                i % 25 === 0 || i % 6 === 0 || i % 7 === 0 || i === 11 || i === 13 || i === 18 || i === 24 
                                  ? "bg-slate-950" 
                                  : "bg-transparent"
                              }`}
                            ></div>
                          ))}
                        </div>
                        {/* QR Center Anchor */}
                        <div className="absolute inset-7 bg-white flex items-center justify-center border border-slate-200">
                          <span className="text-[8px] font-black text-emerald-600 font-mono">M</span>
                        </div>
                      </div>
                      <span className="block text-[8px] font-bold uppercase tracking-widest text-slate-500 mt-2">MSEDCL Dynamic QR</span>
                      <span className="block text-[7px] text-slate-400 uppercase tracking-tight">Scan for Instant UPI</span>
                    </div>
                  </div>

                </div>

                {/* Modal actions close */}
                <div className="bg-slate-50 p-4 border-t border-slate-200 text-right flex-shrink-0">
                  <button
                    onClick={() => setSelectedBillForInvoice(null)}
                    className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs py-2 px-5 rounded-lg transition-all cursor-pointer"
                  >
                    Close Invoice Receipt
                  </button>
                </div>

              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
