-- The public suggestion catalogue in main.js includes each of these exact titles.
insert into public.puzzles (
  puzzle_number, puzzle_date, title, accepted_titles, release_year, genre,
  frame_one_url, frame_two_url, frame_three_url, status
) values
  (22, '2026-10-24', 'Spirited Away', array[]::text[], 2001, 'Animation',
   'https://film-grab.com/wp-content/uploads/photo-gallery/Spirited_Away_001.jpg?bwg=1569839420',
   'https://film-grab.com/wp-content/uploads/photo-gallery/Spirited_Away_033.jpg?bwg=1569839416',
   'https://film-grab.com/wp-content/uploads/photo-gallery/Spirited_Away_065.jpg?bwg=1569839416', 'scheduled'),
  (23, '2026-10-25', 'Whiplash', array[]::text[], 2014, 'Drama',
   'https://film-grab.com/wp-content/uploads/photo-gallery/01%20(1294).jpg?bwg=1547480993',
   'https://film-grab.com/wp-content/uploads/photo-gallery/33%20(1317).jpg?bwg=1547480993',
   'https://film-grab.com/wp-content/uploads/photo-gallery/65%20(891).jpg?bwg=1547480992', 'scheduled'),
  (24, '2026-10-26', 'The Dark Knight', array[]::text[], 2008, 'Action',
   'https://film-grab.com/wp-content/uploads/photo-gallery/01%20(1029).jpg?bwg=1547463350',
   'https://film-grab.com/wp-content/uploads/photo-gallery/32%20(1048).jpg?bwg=1547463350',
   'https://film-grab.com/wp-content/uploads/photo-gallery/63%20(812).jpg?bwg=1547463350', 'scheduled'),
  (25, '2026-10-27', 'Inception', array[]::text[], 2010, 'Science fiction',
   'https://film-grab.com/wp-content/uploads/photo-gallery/01%20(496).jpg?bwg=1547222345',
   'https://film-grab.com/wp-content/uploads/photo-gallery/33%20(504).jpg?bwg=1547222344',
   'https://film-grab.com/wp-content/uploads/photo-gallery/65%20(336).jpg?bwg=1547222344', 'scheduled'),
  (26, '2026-10-28', 'The Social Network', array[]::text[], 2010, 'Drama',
   'https://film-grab.com/wp-content/uploads/photo-gallery/01%20(1170).jpg?bwg=1547470966',
   'https://film-grab.com/wp-content/uploads/photo-gallery/32%20(1190).jpg?bwg=1547470965',
   'https://film-grab.com/wp-content/uploads/photo-gallery/63%20(930).jpg?bwg=1547470964', 'scheduled'),
  (27, '2026-10-29', 'Her', array[]::text[], 2013, 'Romance',
   'https://film-grab.com/wp-content/uploads/photo-gallery/01%20(454).jpg?bwg=1547220405',
   'https://film-grab.com/wp-content/uploads/photo-gallery/33%20(461).jpg?bwg=1547220404',
   'https://film-grab.com/wp-content/uploads/photo-gallery/65%20(304).jpg?bwg=1547220404', 'scheduled'),
  (28, '2026-10-30', 'Mad Max: Fury Road', array[]::text[], 2015, 'Action',
   'https://film-grab.com/wp-content/uploads/photo-gallery/01%20(645).jpg?bwg=1547234462',
   'https://film-grab.com/wp-content/uploads/photo-gallery/33%20(656).jpg?bwg=1547234460',
   'https://film-grab.com/wp-content/uploads/photo-gallery/65%20(446).jpg?bwg=1547234460', 'scheduled')
on conflict (puzzle_number) do nothing;
