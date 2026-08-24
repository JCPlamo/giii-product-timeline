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

  useEffect(() => {
  async function fetchTimeline() {
    const res = await fetch('shopify:admin/api/graphql.json', {
      method: 'POST',
      body: JSON.stringify({
        query: `query GetProduct($id: ID!) {
          product(id: $id) {
            metafield(namespace: "custom", key: "timeline") {
              value
            }
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

    const rawValue = json.data?.product?.metafield?.value;
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
        (a, b) => new Date(a.event_dstp) - new Date(b.event_dstp)
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
      <s-stack direction="block" gap="none">
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
    </s-admin-block>
  );
}