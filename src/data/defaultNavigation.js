const link = (label, path) => ({ label, link: path })

export const defaultTopNavigation = [
  link('Home', '/#home'),
  {
    ...link('Packaging Services', '/packaging-services'),
    children: [
      link('Packaging Development', '/packaging-services/packaging-development'),
      link('Product Protection & Barrier Requirements', '/packaging-services/product-protection-barrier-requirements'),
      link('Packaging Structures & Dielines', '/packaging-services/packaging-structures-dielines'),
      link('Impact Design', '/packaging-services/impact-design'),
      link('Prepress & Printing', '/packaging-services/prepress-printing'),
      link('Sourcing & Manufacturing', '/packaging-services/sourcing-manufacturing'),
      link('Manufacturing Quality Control', '/packaging-services/manufacturing-quality-control'),
      link('Delivery, Fulfillment & Launch', '/packaging-services/delivery-fulfillment-launch'),
      link('Website Product Launch', '/packaging-services/website-product-launch'),
      link('E-Marketing Launch', '/packaging-services/e-marketing-launch'),
      link('Art Templates', '/packaging-services/art-templates'),
    ],
  },
  {
    ...link('Industries', '#industries'),
    children: [
      link('Food & Beverage', '/industries/food-beverage'),
      link('Coffee and Tea', '/industries/coffee-tea'),
      link('Bakery and Snacks', '/industries/bakery-snacks'),
      link('Confections and Candy', '/industries/confections-candy'),
      link('Pet Food and Treats', '/industries/pet-food'),
      link('Vitamins and Supplements', '/industries/vitamins-supplements'),
      link('Health and Beauty', '/industries/health-beauty'),
      link('Household Products', '/industries/household-products'),
      link('Other Product Category', '/industries/other-products'),
    ],
  },
  {
    ...link('Projects', '#projects'),
    children: [
      link('Packaging Starts Here', '/projects/packaging-starts-here'),
      link('Have Product - No Packaging', '/projects/product-no-packaging'),
      link('Have Packaging and Product', '/projects/packaging-and-product'),
      link('Redesign Maintaining Brand', '/projects/redesign-maintaining-brand'),
      link('Sourcing and Manufacturing', '/projects/sourcing-manufacturing'),
      link('Packaging Problems or Issues', '/projects/packaging-problems'),
      link('Cost, Supply and Quality', '/projects/cost-supply-quality'),
    ],
  },
  {
    ...link('About Us', '/about-us'),
    children: [
      link('Our Consulting Approach', '/about-us/consulting-approach'),
      link('Our President and CEO', '/about-us/president-ceo'),
      link('Packaging Experience', '/about-us/packaging-experience'),
      link('U.S. / Offshore Capabilities', '/about-us/us-offshore-capabilities'),
    ],
  },
  {
    ...link('Packaging Times', 'https://packagingtimes.com/'),
    children: [
      link('Visit Packaging Times', 'https://packagingtimes.com/'),
      link('Packaging News & Features', 'https://packagingtimes.com/news'),
      link('Sponsored Advertisers', 'https://packagingtimes.com/advertising'),
    ],
  },
  {
    ...link('Project Review', '#project-review'),
    children: [
      link('Starting Point', '/project-review/starting-point'),
      link('Product & Marketplace', '/project-review/product-marketplace'),
      link('Protection & Function', '/project-review/protection-function'),
      link('Size, Structure & Design', '/project-review/size-structure-design'),
      link('Manufacturing & Supply', '/project-review/manufacturing-supply'),
      link('Upload Files & Timing', '/project-review/upload-files-timing'),
      link('Contact & Submission', '/project-review/contact-submission'),
    ],
  },
  link('Contact Us', '/contact-us'),
]
