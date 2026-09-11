import "@shopify/ui-extensions/preact";
import {render} from 'preact';
import {useState, useEffect} from 'preact/hooks';

export default async () => {
  render(<Extension />, document.body);
}

function Extension() {
  const {data} = shopify;
  const productId = data.selected?.[0]?.id;
  const [notes, setNotes] = useState(/** @type {any[] | null} */ (null));
  const [error, setError] = useState(/** @type {string | null} */ (null));
  const [stats, setStats] = useState(/** @type {any} */ (null));

  useEffect(() => {
  async function fetchTimeline() {
    const res = await fetch('shopify:admin/api/graphql.json', {
      method: 'POST',
      body: JSON.stringify({
        query: `query GetProduct($id: ID!) {
          product(id: $id) {
            activeMoreThan90: metafield(namespace: "custom", key: "active_more_than_90") { value }
            firstMarkDownDate: metafield(namespace: "custom", key: "first_mark_down_date") { value }
            activeDate: metafield(namespace: "custom", key: "active_date") { value }
            daysFullPriceRolling: metafield(namespace: "custom", key: "number_of_days_full_price_rolling") { value }
            daysFullPriceFirst90: metafield(namespace: "custom", key: "number_of_days_full_price_first90") { value }
            rollingDate: metafield(namespace: "custom", key: "rolling_date") { value }
            processRunDate: metafield(namespace: "custom", key: "process_run_date") { value }
            daysLive: metafield(namespace: "custom", key: "number_of_days_live") { value }
            daysHardMark: metafield(namespace: "custom", key: "number_of_days_hard_mark") { value }
            daysPromo: metafield(namespace: "custom", key: "number_of_days_promo") { value }
            daysFullPrice: metafield(namespace: "custom", key: "number_of_days_full_price") { value }
            timeline: metafield(namespace: "custom", key: "timeline") { value }
          }
        }`,
        variables: {id: productId},
      }),
    });
    const json = await res.json();

    if (json.errors) 
    {
      console.error('GraphQL errors:', json.errors);
      setError('Error loading timeline');
      return;
    } 

    const product = json.data?.product;
    if (product) {
      setStats({
        activeDate: product.activeDate?.value ?? '-',
        daysLive: product.daysLive?.value ?? '-',
        daysFullPrice: product.daysFullPrice?.value ?? '-',
        // daysFullPriceRolling: product.daysFullPriceRolling?.value ?? '-',
        // daysFullPriceFirst90: product.daysFullPriceFirst90?.value ?? '-',
        daysHardMark: product.daysHardMark?.value ?? '-',
        daysPromo: product.daysPromo?.value ?? '-',
        rollingDate: product.rollingDate?.value ?? '-',
        active90: capitalize(product.activeMoreThan90?.value) ?? '-',
        firstMarkdown: product.firstMarkDownDate?.value ?? '-',
        processRunDate: product.processRunDate?.value ?? '-',
      });
    }

    const rawValue = json.data?.product?.timeline?.value;
    if (!rawValue)
    {
      setError('No timeline data for this product');
      return;
    }
    
    try 
    {
      const parsed = JSON.parse(rawValue);
      const notesArray = parsed.Notes || parsed.notes;
      if (!notesArray)
      {
        throw new Error('No notes array found');
      }
      const sorted = [...notesArray].sort(
        (a, b) => new Date(b.event_dstp) - new Date(a.event_dstp)
      );
      setNotes(sorted);
    }
    catch (e)
    {
      console.error('Parse error', e);
      setError('Could not parse the timeline data');
    }
  }
  fetchTimeline();
}, [productId]);

  return (
    <s-admin-block heading="Product Timeline">

      <s-stack direction="block" gap="large">
        {/* Product Stats section */}
        <s-stack direction="block" gap="none">
          <s-heading>Product Stats</s-heading>
          <s-stack direction="inline" gap="large-500">
            <s-stack direction="block" gap="none">
              <s-text tone="neutral">Number of Days Live:       {stats?.daysLive}</s-text>
              <s-text tone="neutral">Number of Days Full Price: {stats?.daysFullPrice}</s-text>
              <s-text tone="neutral">Number of Days Hard Mark:  {stats?.daysHardMark}</s-text>
              <s-text tone="neutral">Number of Days Promo:      {stats?.daysPromo}</s-text>
            </s-stack>
            <s-stack direction="block" gap="none">
              <s-text tone="neutral">Active Date:    {formatDate(stats?.activeDate)}</s-text>
              <s-text tone="neutral">Rolling Date:   {formatDate(stats?.rollingDate)}</s-text>
              <s-text tone="neutral">Active for 90+: {stats?.active90}</s-text>
              <s-text tone="neutral">1st Markdown:   {formatDate(stats?.firstMarkdown)}</s-text>
            </s-stack>
          </s-stack>
        </s-stack>

        <s-text tone="neutral">Process Run Date: {formatDate(stats?.processRunDate)}</s-text>

        {/* Timeline */}
        <s-stack direction="block" gap="none">
          <s-heading>Product Timeline</s-heading>
          <s-heading>Current Timeline</s-heading>
          {notes && notes.map((note, i) => (
            <s-stack key={i} direction="inline" gap="base" alignItems="start">
              <s-stack direction="block" alignItems="center" gap="none">
                <s-box
                  inlineSize="2px"
                  blockSize="8px"
                  background={i > 0 ? "strong" : "transparent"}
                />
                <s-stack
                  direction="block"
                  alignItems="center"
                  justifyContent="center"
                  inlineSize="15px"
                  blockSize="15px"
                  borderRadius="small-200"
                  background="strong"
                >
                  <s-icon type="bullet" color="base" tone="neutral" size="base"/>
                </s-stack>
                {i < notes.length - 1 && (
                  <s-box
                    inlineSize="2px"
                    blockSize="44px"
                    background="strong"
                  />
                )}
              </s-stack>
              <s-stack direction="block" gap="none">
                <s-text type="strong">{note.event_title}</s-text>
                <s-text tone="neutral">
                  {new Date(note.event_dstp).toLocaleString('en-US', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </s-text>
              </s-stack>
            </s-stack>
          ))}
        </s-stack>

      </s-stack>
    </s-admin-block>
  );
}

function formatDate(date) {
  if (!date || date === '-') return '-';

  const [year, month, day] = date.split('-').map(Number);
  if (!year || !month || !day) return '-';

  const localDate = new Date(year, month - 1, day); // local time, no UTC shift
  return localDate.toLocaleString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  });
}

function capitalize(str) {
  if (!str) return '-';
  return str.charAt(0).toUpperCase() + str.slice(1);
}