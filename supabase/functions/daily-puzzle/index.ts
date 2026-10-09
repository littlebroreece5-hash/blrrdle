import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};
const respond = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});
const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');
const validPlayerId = (value: unknown): value is string =>
  typeof value === 'string' && value.length >= 8 && value.length <= 128;

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
  const dateParts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const date = Object.fromEntries(dateParts.map(({ type, value }) => [type, value]));
  const today = date.year + '-' + date.month + '-' + date.day;
  const url = new URL(request.url);
  const body = request.method === 'POST' ? await request.json().catch(() => ({})) : {};
  const { action, value, puzzleNumber, attempt, playerId } = body;

  if (action === 'archive') {
    const { data: archive, error: archiveError } = await supabase.from('puzzles').select('puzzle_number, puzzle_date, title').lte('puzzle_date', today).in('status', ['scheduled', 'published']).order('puzzle_number', { ascending: false });
    if (archiveError) return respond({ error: 'Unable to load the archive.' }, 500);
    return respond({ puzzles: archive ?? [] });
  }

  const requestedNumber = Number(puzzleNumber ?? url.searchParams.get('puzzle'));
  let puzzleQuery = supabase.from('puzzles').select('puzzle_number, title, accepted_titles, release_year, genre, frame_one_url, frame_two_url, frame_three_url').in('status', ['scheduled', 'published']);
  puzzleQuery = requestedNumber ? puzzleQuery.eq('puzzle_number', requestedNumber) : puzzleQuery.eq('puzzle_date', today);
  const { data: puzzle, error } = await puzzleQuery.maybeSingle();
  if (error) return respond({ error: 'Unable to load today’s puzzle.' }, 500);
  if (!puzzle) return respond({ error: 'No puzzle is scheduled for today.' }, 404);
  if (request.method === 'GET') return respond({ number: puzzle.puzzle_number, frameUrl: puzzle.frame_one_url });

  if (action === 'stats') {
    const [{ data: results, error: resultsError }, { count: totalPlays, error: playsError }] = await Promise.all([
      supabase.from('puzzle_results').select('guess_count').eq('puzzle_number', puzzle.puzzle_number),
      supabase.from('puzzle_plays').select('*', { count: 'exact', head: true }).eq('puzzle_number', puzzle.puzzle_number),
    ]);
    if (resultsError || playsError) return respond({ error: 'Unable to load today’s results.' }, 500);
    const guesses = [1, 2, 3].map((guess) => (results ?? []).filter((result) => result.guess_count === guess).length);
    return respond({ guesses, totalWinners: (results ?? []).length, totalPlays: totalPlays ?? 0 });
  }

  if (action === 'guess') {
    const answers = [puzzle.title, ...(puzzle.accepted_titles ?? [])].map(normalize);
    const correct = answers.includes(normalize(String(value ?? '')));
    const safeAttempt = Math.min(3, Math.max(1, Number(attempt) || 1));
    if (validPlayerId(playerId)) {
      const { error: playError } = await supabase.from('puzzle_plays').upsert(
        { puzzle_number: puzzle.puzzle_number, player_id: playerId },
        { onConflict: 'puzzle_number,player_id', ignoreDuplicates: true },
      );
      if (playError) return respond({ error: 'Unable to record this play.' }, 500);
    }
    if (correct && validPlayerId(playerId)) {
      const { error: resultError } = await supabase.from('puzzle_results').upsert(
        { puzzle_number: puzzle.puzzle_number, player_id: playerId, guess_count: safeAttempt },
        { onConflict: 'puzzle_number,player_id' },
      );
      if (resultError) return respond({ error: 'Unable to record this result.' }, 500);
    }
    return respond({ correct, ...(correct || Number(attempt) >= 3 ? { title: puzzle.title } : {}) });
  }

  if (action === 'frame') {
    const index = Math.min(3, Math.max(1, Number(value) || 1));
    return respond({ frameUrl: [puzzle.frame_one_url, puzzle.frame_two_url, puzzle.frame_three_url][index - 1] });
  }
  if (action === 'hint' && value === 'year') return respond({ value: puzzle.release_year });
  if (action === 'hint' && value === 'genre') return respond({ value: puzzle.genre });
  return respond({ error: 'Unknown request.' }, 400);
});
