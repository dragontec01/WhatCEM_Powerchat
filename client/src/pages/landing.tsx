import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useBranding } from '@/contexts/branding-context';
import { usePublicPlans } from '@/hooks/use-public-plans';
import { useTranslation } from '@/hooks/use-translation';
import '@/styles/landing.css';
import { Button } from '@/components/ui/button';
import { PriceDisplay } from '@/components/ui/price-display';
import { Card, CardContent } from '@/components/ui/card';
import { getPlanBillingPeriod } from '@/utils/plan-duration';
import {
  MessageSquare,
  Bot,
  Users,
  Zap,
  BarChart3,
  Workflow,
  ArrowRight,
  CheckCircle,
  Star,
  Play,
  Shield,
  Clock,
  Mail,
  TrendingUp,
  Award,
  Menu,
  X,
  Loader2
} from 'lucide-react';

export default function LandingPage() {
  const { user } = useAuth();
  const { branding } = useBranding();
  const { t } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { plans, isLoading: plansLoading, error: plansError } = usePublicPlans();


  if (user) {
    window.location.href = '/inbox';
    return null;
  }

  return (
    <div className="min-h-screen bg-white landing-page">
      {/* Navigation Header */}
      <nav className="glass-nav sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              {branding.logoUrl ? (
                <img src={branding.logoUrl} alt={branding.appName} className="h-8 w-auto" />
              ) : (
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">{branding.appName.charAt(0)}</span>
                  </div>
                  <span className="ml-2 text-xl font-bold text-gray-900">{branding.appName}</span>
                </div>
              )}
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="nav-link text-gray-600 hover:text-gray-900 transition-colors">{t('landing.nav.features', 'Características')}</a>
              <a href="#pricing" className="nav-link text-gray-600 hover:text-gray-900 transition-colors">{t('landing.nav.pricing', 'Precios')}</a>
              <a href="#about" className="nav-link text-gray-600 hover:text-gray-900 transition-colors">{t('landing.nav.about', 'Acerca de')}</a>
              <a href="#contact" className="nav-link text-gray-600 hover:text-gray-900 transition-colors">{t('landing.nav.contact', 'Contacto')}</a>
              <Button variant="ghost" asChild>
                <a href="/auth">{t('landing.nav.sign_in', 'Iniciar sesión')}</a>
              </Button>
              <Button className="bg-blue-600 hover:bg-blue-700" asChild>
                <a href="/register">{t('landing.nav.get_started', 'Comenzar')}</a>
              </Button>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-gray-200 py-4 mobile-menu">
              <div className="flex flex-col space-y-4">
                <a href="#features" className="text-gray-600 hover:text-gray-900 transition-colors">{t('landing.nav.features', 'Características')}</a>
                <a href="#pricing" className="text-gray-600 hover:text-gray-900 transition-colors">{t('landing.nav.pricing', 'Precios')}</a>
                <a href="#about" className="text-gray-600 hover:text-gray-900 transition-colors">{t('landing.nav.about', 'Acerca de')}</a>
                <a href="#contact" className="text-gray-600 hover:text-gray-900 transition-colors">{t('landing.nav.contact', 'Contacto')}</a>
                <div className="flex flex-col space-y-2 pt-4 border-t border-gray-200">
                  <Button variant="ghost" asChild>
                    <a href="/auth">{t('landing.nav.sign_in', 'Iniciar sesión')}</a>
                  </Button>
                  <Button className="bg-blue-600 hover:bg-blue-700" asChild>
                    <a href="/register">{t('landing.nav.get_started', 'Comenzar')}</a>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative hero-gradient section-padding">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center hero-grid">
            {/* Hero Content */}
            <div className="text-center lg:text-left hero-content">
              <h1 className="hero-title text-4xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
                {t('landing.hero.title', '¿Listo para transformar la comunicación con tus clientes?')}
              </h1>
              <p className="hero-subtitle text-xl text-gray-600 mb-8 max-w-2xl">
                {t('landing.hero.subtitle', `Únete a miles de empresas que utilizan ${branding.appName} para optimizar sus interacciones con los clientes y aumentar las tasas de satisfacción.`)}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start cta-buttons">
                <Button size="lg" className="btn-primary bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-lg" asChild>
                  <a href="/register">
                    {t('landing.hero.start_free_trial', 'Comenzar prueba gratuita')} <ArrowRight className="ml-2 h-5 w-5" />
                  </a>
                </Button>
                <Button size="lg" variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-50 px-8 py-4 text-lg" asChild>
                  <a href="#demo" className="flex items-center">
                    <Play className="mr-2 h-5 w-5" />
                    Ver Demo
                  </a>
                </Button>
              </div>

              {/* Trust Indicators */}
              <div className="mt-12 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-8">
                <div className="flex items-center">
                  <div className="flex -space-x-2">
                    <div className="w-8 h-8 bg-blue-500 rounded-full border-2 border-white"></div>
                    <div className="w-8 h-8 bg-green-500 rounded-full border-2 border-white"></div>
                    <div className="w-8 h-8 bg-purple-500 rounded-full border-2 border-white"></div>
                    <div className="w-8 h-8 bg-orange-500 rounded-full border-2 border-white"></div>
                  </div>
                  <span className="ml-3 text-sm text-gray-600">Confiado por más de 10,000 empresas</span>
                </div>
                <div className="flex items-center">
                  <div className="flex text-yellow-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-current" />
                    ))}
                  </div>
                  <span className="ml-2 text-sm text-gray-600">4.9/5 calificación</span>
                </div>
              </div>
            </div>

            {/* Hero Image/Dashboard Preview */}
            <div className="relative hero-image">
              <div className="glass-card rounded-2xl shadow-2xl p-6 transform rotate-3 dashboard-preview">
                <div className="bg-gray-100 rounded-lg p-4">
                  {/* Mock Dashboard */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    </div>
                    <div className="text-xs text-gray-500">{branding.appName} Panel de Control</div>
                  </div>

                  {/* Mock Chart */}
                  <div className="bg-white rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold text-gray-800">Mensajes de Analíticas</h3>
                      <TrendingUp className="w-4 h-4 text-green-500" />
                    </div>
                    <div className="flex items-end space-x-1 h-20">
                      {[40, 60, 30, 80, 50, 90, 70].map((height, i) => (
                        <div
                          key={i}
                          className="bg-blue-500 rounded-t"
                          style={{ height: `${height}%`, width: '12px' }}
                        ></div>
                      ))}
                    </div>
                  </div>

                  {/* Mock Messages */}
                  <div className="space-y-2">
                    <div className="bg-white rounded-lg p-3 flex items-center space-x-3">
                      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                        <MessageSquare className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="text-xs text-gray-600">WhatsApp</div>
                        <div className="text-sm text-gray-800">Nueva consulta de cliente</div>
                      </div>
                      <div className="text-xs text-gray-500">hace 2 minutos</div>
                    </div>
                    <div className="bg-white rounded-lg p-3 flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                        <Mail className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="text-xs text-gray-600">Email</div>
                        <div className="text-sm text-gray-800">Ticket de soporte resuelto</div>
                      </div>
                      <div className="text-xs text-gray-500">hace 5 minutos</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                Todo lo que necesitas para gestionar la comunicación con tus clientes
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Funcionalidades potentes diseñadas para optimizar tu flujo de trabajo y mejorar las relaciones con los clientes
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 features-grid">
            {/* Feature 1 */}
            <Card className="feature-card p-6 hover:shadow-lg transition-shadow duration-300">
              <CardContent className="p-0">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <MessageSquare className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Mensajería Multicanal</h3>
                <p className="text-gray-600">
                  Conecta WhatsApp, Email, Facebook, Instagram y Telegram en una bandeja de entrada unificada.
                  Nunca pierdas un mensaje de cliente nuevamente.
                </p>
              </CardContent>
            </Card>

            {/* Feature 2 */}
            <Card className="feature-card p-6 hover:shadow-lg transition-shadow duration-300">
              <CardContent className="p-0">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                  <Bot className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Automatización impulsada por IA</h3>
                <p className="text-gray-600">
                  Chatbots inteligentes con integración de OpenAI, Claude y Gemini.
                  Automatiza respuestas manteniendo conversaciones con apariencia humana.
                </p>
              </CardContent>
            </Card>

            {/* Feature 3 */}
            <Card className="feature-card p-6 hover:shadow-lg transition-shadow duration-300">
              <CardContent className="p-0">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                  <Users className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Colaboración en equipo</h3>
                <p className="text-gray-600">
                  Bandeja de entrada de equipo en tiempo real con control de acceso basado en roles.
                  Colabora sin problemas con los miembros de tu equipo.
                </p>
              </CardContent>
            </Card>

            {/* Feature 4 */}
            <Card className="feature-card p-6 hover:shadow-lg transition-shadow duration-300">
              <CardContent className="p-0">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                  <Workflow className="w-6 h-6 text-orange-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Constructor Visual de Flujos</h3>
                <p className="text-gray-600">
                  Interfaz de arrastrar y soltar para crear flujos de automatización sofisticados
                  y recorridos de clientes sin necesidad de programar.
                </p>
              </CardContent>
            </Card>

            {/* Feature 5 */}
            <Card className="feature-card p-6 hover:shadow-lg transition-shadow duration-300">
              <CardContent className="p-0">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                  <BarChart3 className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Analítica Avanzada</h3>
                <p className="text-gray-600">
                  Información y reportes completos para optimizar la comunicación con tus clientes
                  y rastrear métricas de rendimiento.
                </p>
              </CardContent>
            </Card>

            {/* Feature 6 */}
            <Card className="feature-card p-6 hover:shadow-lg transition-shadow duration-300">
              <CardContent className="p-0">
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6 text-yellow-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Seguridad Empresarial</h3>
                <p className="text-gray-600">
                  Seguridad a nivel bancario con cifrado de extremo a extremo, estándares de cumplimiento,
                  y protección de datos para tu negocio.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Confiado por empresas en todo el mundo
            </h2>
            <p className="text-gray-600">
              Únete a miles de empresas que confían en {branding.appName} para su comunicación con clientes
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center stats-grid">
            <div className="stat-counter">
              <div className="text-3xl font-bold text-blue-600 mb-2">10,000+</div>
              <div className="text-gray-600">Usuarios Activos</div>
            </div>
            <div className="stat-counter">
              <div className="text-3xl font-bold text-green-600 mb-2">99.9%</div>
              <div className="text-gray-600">Tiempo de actividad</div>
            </div>
            <div className="stat-counter">
              <div className="text-3xl font-bold text-purple-600 mb-2">50M+</div>
              <div className="text-gray-600">Mensajes Procesados</div>
            </div>
            <div className="stat-counter">
              <div className="text-3xl font-bold text-orange-600 mb-2">24/7</div>
              <div className="text-gray-600">Soporte</div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              {t('landing.pricing.title', 'Precios simples y transparentes')}
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {t('landing.pricing.subtitle', 'Elige el plan perfecto para tu negocio. Comienza gratis, actualiza cuando necesites más.')}
            </p>
          </div>

          {plansLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <span className="ml-2 text-gray-600">{t('landing.pricing.loading', 'Cargando planes de precios...')}</span>
            </div>
          ) : plansError ? (
            <div className="text-center py-12">
              <p className="text-red-600 mb-4">{t('landing.pricing.error', 'Error al cargar los planes de precios')}</p>
              <Button onClick={() => window.location.reload()} variant="outline">
                {t('landing.pricing.retry', 'Reintentar')}
              </Button>
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto pricing-grid">
              {plans.map((plan, index) => (
                <Card
                  key={plan.id}
                  className={`pricing-card p-8 hover:shadow-lg transition-shadow duration-300 ${
                    index === 1 ? 'popular border-2 border-blue-500 relative' : ''
                  }`}
                >
                  {index === 1 && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                        {t('landing.pricing.most_popular', 'Más Popular')}
                      </span>
                    </div>
                  )}
                  <CardContent className="p-0">
                    <div className="text-center">
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">{plan.name}</h3>
                      <div className="mb-6">
                        {plan.price === 0 ? (
                          <div>
                            <div className="text-4xl font-bold text-gray-900 mb-1">
                              {t('landing.pricing.free', 'Gratis')}
                            </div>
                            <div className="text-gray-600">{t('landing.pricing.forever', 'para siempre')}</div>
                          </div>
                        ) : (
                          <PriceDisplay
                            plan={plan as any}
                            size="xl"
                            showDiscountBadge={true}
                            showSavings={true}
                            layout="vertical"
                            period={getPlanBillingPeriod(plan)}
                            className="justify-center items-center"
                          />
                        )}
                      </div>
                      <Button
                        className={`w-full mb-6 ${index === 1 ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
                        variant={plan.isFree ? "default" : index === 1 ? "default" : "outline"}
                        asChild
                      >
                        <a href="/register">
                          {plan.isFree ? t('landing.pricing.get_started_free', 'Comenzar Gratis') :
                           plan.hasTrialPeriod ? t('landing.pricing.start_trial', 'Comenzar prueba gratuita de {{days}} días', { days: plan.trialDays }) :
                           t('landing.pricing.get_started', 'Comenzar Ahora')}
                        </a>
                      </Button>
                    </div>
                    <ul className="space-y-3">
                      <li className="flex items-center">
                        <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                        <span className="text-gray-600">{t('landing.pricing.users', 'Hasta {{count}} usuarios', { count: plan.maxUsers })}</span>
                      </li>
                      <li className="flex items-center">
                        <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                        <span className="text-gray-600">{t('landing.pricing.contacts', '{{count}} contactos', { count: plan.maxContacts.toLocaleString() })}</span>
                      </li>
                      <li className="flex items-center">
                        <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                        <span className="text-gray-600">{t('landing.pricing.channels', '{{count}} canales', { count: plan.maxChannels })}</span>
                      </li>
                      <li className="flex items-center">
                        <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                        <span className="text-gray-600">{t('landing.pricing.flows', '{{count}} flujos', { count: plan.maxFlows })}</span>
                      </li>
                      {plan.features.map((feature: string, featureIndex: number) => (
                        <li key={featureIndex} className="flex items-center">
                          <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                          <span className="text-gray-600">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="section-padding cta-gradient">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">
            {t('landing.cta.title', '¿Listo para transformar la comunicación con tus clientes?')}
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            {t('landing.cta.subtitle', `Únete a miles de empresas que utilizan ${branding.appName} para optimizar sus interacciones con clientes y aumentar la satisfacción.`)}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center cta-buttons">
            <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-4 text-lg" asChild>
              <a href="/register">
                {t('landing.cta.start_free_trial', 'Comenzar prueba gratuita')} <ArrowRight className="ml-2 h-5 w-5" />
              </a>
            </Button>
            <Button size="lg" variant="outline" className="cta-sign-in-btn border-white text-white hover:bg-white hover:text-blue-600 px-8 py-4 text-lg bg-transparent" asChild>
              <a href="/auth" className="text-white hover:text-blue-600">{t('landing.cta.sign_in', 'Iniciar sesión')}</a>
            </Button>
          </div>

          {/* Trust badges */}
          <div className="mt-12 flex flex-wrap justify-center items-center gap-8 opacity-80">
            <div className="flex items-center text-white trust-badge">
              <Shield className="w-5 h-5 mr-2" />
              <span className="text-sm">{t('landing.trust.enterprise_security', 'Seguridad Empresarial')}</span>
            </div>
            <div className="flex items-center text-white trust-badge">
              <Clock className="w-5 h-5 mr-2" />
              <span className="text-sm">{t('landing.trust.uptime', '99.9% Tiempo de actividad')}</span>
            </div>
            <div className="flex items-center text-white trust-badge">
              <Award className="w-5 h-5 mr-2" />
              <span className="text-sm">{t('landing.trust.soc2_compliant', 'Cumple con SOC 2')}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 footer-grid">
            {/* Company Info */}
            <div className="md:col-span-1">
              <div className="flex items-center mb-4">
                {branding.logoUrl ? (
                  <img src={branding.logoUrl} alt={branding.appName} className="h-8 w-auto" />
                ) : (
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-sm">{branding.appName.charAt(0)}</span>
                    </div>
                    <span className="ml-2 text-xl font-bold">{branding.appName}</span>
                  </div>
                )}
              </div>
              <p className="text-gray-400 mb-4">
                La plataforma completa de comunicación con clientes para negocios modernos.
              </p>
              <div className="flex space-x-4">
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <MessageSquare className="w-5 h-5" />
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <Users className="w-5 h-5" />
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <Mail className="w-5 h-5" />
                </a>
              </div>
            </div>

            {/* Product Links */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Producto</h3>
              <ul className="space-y-2">
                <li><a href="#features" className="text-gray-400 hover:text-white transition-colors">Características</a></li>
                <li><a href="#pricing" className="text-gray-400 hover:text-white transition-colors">Precios</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Integraciones</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">API</a></li>
              </ul>
            </div>

            {/* Company Links */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Compañía</h3>
              <ul className="space-y-2">
                <li><a href="#about" className="text-gray-400 hover:text-white transition-colors">Acerca de</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Bolsa de trabajo</a></li>
                <li><a href="#contact" className="text-gray-400 hover:text-white transition-colors">Contacto</a></li>
              </ul>
            </div>

            {/* Support Links */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Soporte</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Centro de ayuda</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Documentación</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Estado</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Política de privacidad</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              © 2025 {branding.appName}. Todos los derechos reservados.
            </p>
            <div className="flex items-center space-x-6 mt-4 md:mt-0">
              <a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">Términos de servicio</a>
              <a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">Política de privacidad</a>
              <a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">Política de cookies</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
