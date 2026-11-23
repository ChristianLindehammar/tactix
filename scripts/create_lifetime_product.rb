#!/usr/bin/env ruby
# Creates the one-time purchase of the exercise library, coachmate_premium_lifetime, in App Store Connect and
# Google Play, with the keys fastlane already uses (see fastlane/Fastfile). Safe to run again: it fills in what's
# missing. Never delete the product to start over: neither store allows a product ID again.
#
#   bundle exec ruby scripts/create_lifetime_product.rb [ios|android]
#
# Price: $14.99, 149 kr in Sweden, the rest converted from the US price by each store.
# Afterwards, in RevenueCat: attach both products to the "premium" entitlement and add them to the current
# offering as its Lifetime package. The first in-app purchase on iOS is submitted with an app version: pick it on
# the version page before review, after adding a review screenshot of the sales page.
require "json"
require "jwt"
require "net/http"
require "openssl"

PRODUCT_ID = "coachmate_premium_lifetime"
NAME = "Exercise library"
USD = "14.99"
SEK = "149"
REVIEW_NOTE = "A one-time purchase that unlocks the ready-made exercise library for good. Bought on the Exercises " \
              "tab, which shows what is included and the price before buying. No subscription."
# Title (at most 30 characters on the App Store) and description (at most 55)
TEXTS = {
  "en" => ["Exercise library", "Every ready-made exercise for good. Pay once."],
  "sv" => ["Övningsbanken", "Alla färdiga övningar för alltid. Betala en gång."],
  "fi" => ["Harjoituspankki", "Kaikki valmiit harjoitukset pysyvästi. Kertamaksu."],
}.freeze

def request(method, uri, headers, body = nil)
  req = Net::HTTP.const_get(method.capitalize).new(uri)
  headers.each { |k, v| req[k] = v }
  req["Content-Type"] = "application/json"
  req.body = body.to_json if body
  res = Net::HTTP.start(uri.host, uri.port, use_ssl: true) { |http| http.request(req) }
  data = res.body.to_s.empty? ? {} : (JSON.parse(res.body) rescue { "body" => res.body[0, 300] })
  raise "#{method.upcase} #{uri}: #{res.code}\n#{JSON.pretty_generate(data)}" unless res.code.start_with?("2")
  data
end

module AppStore
  KEY_ID = "HGL5XFT2B3" # App Manager, the only key allowed to create in-app purchases
  ISSUER_ID = "c182c483-9d61-427c-b16a-28deba60b60f"
  BUNDLE_ID = "com.lindehammar-konsult.coachmate"
  LOCALES = { "en" => "en-US", "sv" => "sv", "fi" => "fi" }.freeze

  module_function

  def token
    key = OpenSSL::PKey.read(File.read(File.expand_path("../fastlane/AuthKey_#{KEY_ID}.p8", __dir__)))
    @token ||= JWT.encode({ iss: ISSUER_ID, iat: Time.now.to_i, exp: Time.now.to_i + 1200, aud: "appstoreconnect-v1" },
                          key, "ES256", { kid: KEY_ID, typ: "JWT" })
  end

  def api(method, path, body = nil)
    uri = URI(path.start_with?("http") ? path : "https://api.appstoreconnect.apple.com#{path}")
    request(method, uri, { "Authorization" => "Bearer #{token}" }, body)
  end

  def all(path)
    items = []
    while path
      page = api(:get, path)
      items += page["data"]
      path = page.dig("links", "next")
    end
    items
  end

  def price_point(iap_id, territory, price)
    all("/v2/inAppPurchases/#{iap_id}/pricePoints?filter[territory]=#{territory}&limit=200")
      .find { |p| p.dig("attributes", "customerPrice").to_f == price.to_f } or abort "No #{price} price point in #{territory}"
  end

  def run
    app = api(:get, "/v1/apps?filter[bundleId]=#{BUNDLE_ID}")["data"].first or abort "No app #{BUNDLE_ID}"
    iap = all("/v1/apps/#{app['id']}/inAppPurchasesV2?limit=200").find { |i| i.dig("attributes", "productId") == PRODUCT_ID }
    if iap
      puts "App Store: #{PRODUCT_ID} exists (#{iap.dig('attributes', 'state')}), filling in what's missing"
    else
      iap = api(:post, "/v2/inAppPurchases", { data: {
        type: "inAppPurchases",
        attributes: { name: NAME, productId: PRODUCT_ID, inAppPurchaseType: "NON_CONSUMABLE",
                      reviewNote: REVIEW_NOTE, familySharable: false },
        relationships: { app: { data: { type: "apps", id: app["id"] } } },
      } })["data"]
      puts "App Store: created #{PRODUCT_ID} (#{iap['id']})"
    end

    have = all("/v2/inAppPurchases/#{iap['id']}/inAppPurchaseLocalizations?limit=50").map { |l| l.dig("attributes", "locale") }
    TEXTS.each do |language, (name, description)|
      locale = LOCALES.fetch(language)
      next if have.include?(locale)
      api(:post, "/v1/inAppPurchaseLocalizations", { data: {
        type: "inAppPurchaseLocalizations", attributes: { locale: locale, name: name, description: description },
        relationships: { inAppPurchaseV2: { data: { type: "inAppPurchases", id: iap["id"] } } },
      } })
    end

    prices = (api(:get, "/v2/inAppPurchases/#{iap['id']}/iapPriceSchedule?include=manualPrices")["included"] rescue nil)
    if prices.to_a.empty?
      manual = [["USA", USD], ["SWE", SEK]].each_with_index.map do |(territory, price), i|
        { type: "inAppPurchasePrices", id: "${price#{i}}", attributes: { startDate: nil },
          relationships: {
            inAppPurchaseV2: { data: { type: "inAppPurchases", id: iap["id"] } },
            inAppPurchasePricePoint: { data: { type: "inAppPurchasePricePoints",
                                               id: price_point(iap["id"], territory, price)["id"] } },
          } }
      end
      api(:post, "/v1/inAppPurchasePriceSchedules", {
        data: { type: "inAppPurchasePriceSchedules", relationships: {
          inAppPurchase: { data: { type: "inAppPurchases", id: iap["id"] } },
          baseTerritory: { data: { type: "territories", id: "USA" } },
          manualPrices: { data: manual.map { |m| { type: m[:type], id: m[:id] } } },
        } },
        included: manual,
      })
    end

    unless (api(:get, "/v2/inAppPurchases/#{iap['id']}/inAppPurchaseAvailability")["data"] rescue nil)
      territories = all("/v1/territories?limit=200").map { |t| { type: "territories", id: t["id"] } }
      api(:post, "/v1/inAppPurchaseAvailabilities", { data: {
        type: "inAppPurchaseAvailabilities", attributes: { availableInNewTerritories: true },
        relationships: { inAppPurchase: { data: { type: "inAppPurchases", id: iap["id"] } },
                         availableTerritories: { data: territories } },
      } })
    end
    puts "App Store: #{TEXTS.size} languages, $#{USD} / #{SEK} kr, every territory"
    upload_review_screenshot(iap)
  end

  # The sales page on the Exercises tab, from the simulator's dev build (no RevenueCat key, so the dev store shows
  # the price). A 6.9" store size, JPEG without alpha.
  SHOT = File.expand_path("../fastlane/iap-review.jpg", __dir__)

  def upload_review_screenshot(iap)
    if (api(:get, "/v2/inAppPurchases/#{iap['id']}/appStoreReviewScreenshot")["data"] rescue nil)
      return puts "App Store: has a review screenshot"
    end
    return puts "App Store: no #{SHOT}, so no review screenshot yet" unless File.exist?(SHOT)

    require "digest"
    bytes = File.binread(SHOT)
    shot = api(:post, "/v1/inAppPurchaseAppStoreReviewScreenshots", { data: {
      type: "inAppPurchaseAppStoreReviewScreenshots", attributes: { fileName: File.basename(SHOT), fileSize: bytes.size },
      relationships: { inAppPurchaseV2: { data: { type: "inAppPurchases", id: iap["id"] } } },
    } })["data"]
    shot.dig("attributes", "uploadOperations").each do |op|
      uri = URI(op["url"])
      req = Net::HTTP.const_get(op["method"].capitalize).new(uri)
      op["requestHeaders"].each { |h| req[h["name"]] = h["value"] }
      req.body = bytes.byteslice(op["offset"], op["length"])
      code = Net::HTTP.start(uri.host, uri.port, use_ssl: true) { |http| http.request(req) }.code
      raise "Uploading the review screenshot: #{code}" unless code.start_with?("2")
    end
    api(:patch, "/v1/inAppPurchaseAppStoreReviewScreenshots/#{shot['id']}", { data: {
      type: "inAppPurchaseAppStoreReviewScreenshots", id: shot["id"],
      attributes: { uploaded: true, sourceFileChecksum: Digest::MD5.hexdigest(bytes) },
    } })
    puts "App Store: review screenshot uploaded"
  end
end

module GooglePlay
  PACKAGE = "com.lindehammarkonsult.coachmate"
  LANGUAGES = { "en" => "en-US", "sv" => "sv-SE", "fi" => "fi-FI" }.freeze
  OPTION = "buy"

  module_function

  def token
    require "googleauth"
    @token ||= Google::Auth::ServiceAccountCredentials.make_creds(
      json_key_io: File.open(File.expand_path("../fastlane/play-store-credentials.json", __dir__)),
      scope: "https://www.googleapis.com/auth/androidpublisher",
    ).fetch_access_token!["access_token"]
  end

  def api(method, path, body = nil)
    uri = URI("https://androidpublisher.googleapis.com/androidpublisher/v3/applications/#{PACKAGE}/#{path}")
    request(method, uri, { "Authorization" => "Bearer #{token}" }, body)
  end

  def money(currency, amount)
    units, cents = amount.split(".")
    { currencyCode: currency, units: units, nanos: (cents || "0").ljust(9, "0").to_i }
  end

  def run
    existing = api(:get, "oneTimeProducts")["oneTimeProducts"].to_a.find { |p| p["productId"] == PRODUCT_ID }
    if existing
      puts "Google Play: #{PRODUCT_ID} exists, filling in what's missing"
    else
      # Every region gets Play's conversion of the US price, except Sweden's own
      converted = api(:post, "pricing:convertRegionPrices", { price: money("USD", USD) })
      regions = converted["convertedRegionPrices"].values.map do |region|
        price = region["regionCode"] == "SE" ? money("SEK", SEK) : region["price"]
        { regionCode: region["regionCode"], price: price, availability: "AVAILABLE" }
      end
      # Only this one is spelled in lower case
      api(:patch, "onetimeproducts/#{PRODUCT_ID}?allowMissing=true&regionsVersion.version=#{URI.encode_www_form_component(converted.dig('regionVersion', 'version'))}" \
                  "&updateMask=listings,purchaseOptions", {
        packageName: PACKAGE,
        productId: PRODUCT_ID,
        listings: TEXTS.map { |language, (title, description)|
          { languageCode: LANGUAGES.fetch(language), title: title, description: description }
        },
        purchaseOptions: [{
          purchaseOptionId: OPTION,
          # The one older Play Billing versions can buy
          buyOption: { legacyCompatible: true, multiQuantityEnabled: false },
          regionalPricingAndAvailabilityConfigs: regions,
          newRegionsConfig: { usdPrice: money("USD", USD), eurPrice: converted.dig("convertedOtherRegionsPrice", "eurPrice"),
                              availability: "AVAILABLE" },
        }],
      })
      puts "Google Play: created #{PRODUCT_ID} in #{regions.size} regions"
    end

    state = api(:get, "oneTimeProducts/#{PRODUCT_ID}")["purchaseOptions"].to_a.find { |o| o["purchaseOptionId"] == OPTION }&.dig("state")
    unless state == "ACTIVE"
      api(:post, "oneTimeProducts/#{PRODUCT_ID}/purchaseOptions:batchUpdateStates", { requests: [{
        activatePurchaseOptionRequest: { packageName: PACKAGE, productId: PRODUCT_ID, purchaseOptionId: OPTION },
      }] })
    end
    puts "Google Play: #{TEXTS.size} languages, $#{USD} / #{SEK} kr, active"
  end
end

only = ARGV.first
AppStore.run unless only == "android"
GooglePlay.run unless only == "ios"
