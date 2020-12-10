from math import ceil, sqrt
import subprocess
import sys

import librosa
import numpy as np

def detect_blip_onsets(metro_filename):
    '''
    This function loads the metronome audio and detects the beat onsets.
    '''
    print(f'loading {metro_filename}')
    metronome, sample_rate = librosa.load(metro_filename)
    onset_frames = librosa.onset.onset_detect(metronome, sr=sample_rate, wait=1, pre_avg=1, pre_max=1, post_max=1)
    onset_times = librosa.frames_to_time(onset_frames)
    # onset_times has both on and off times (is an off the onset of silence? 🤔)
    # remove the first marker if it's an off marker
    if (onset_times[1] - onset_times[0]) > 0.2:
        onset_times = onset_times[1:]
    # and remove the last marker if it's an on marker
    if (onset_times[-1] - onset_times[-2]) > 0.2:
        onset_times = onset_times[:-1]
    # and then remove all remaining off markers
    return onset_times[::2]

def align_videos_to_metronome(num_peers):
    '''
    This function generates an ffmpeg command
    to timestretch the audio according to the reference metronome
    and stack the videos into a grid.
    '''
    # TODO: multiprocess this part?
    metronomes = [
        detect_blip_onsets(f'output/peer{peer_number}_metronome.webm')
        for peer_number
        in range(num_peers)
    ]
    reference_metro = metronomes[0]

    slice_n_stretch_commands = []
    merge_inputs = []
    for metro_index, metronome in enumerate(metronomes):
        if metro_index == 0:
            # the first metro is passed thru unchanged
            first_metro = f'[0:a] asetpts=PTS-STARTPTS [a0];'
            slice_n_stretch_commands.append(first_metro)
            merge_inputs.append('[a0]')
            continue

        if len(reference_metro) != len(metronome):
            raise Exception(f'Metronome {metro_index} has {len(metronome)} blips but the reference metro has {len(reference_metro)}')

        for blip_index, blip_time in enumerate(metronome):
            start_time = 0 if blip_index == 0 else metronome[blip_index - 1]
            # 1. trim out each slice of audio
            slice_command = f'atrim=start={start_time:.3f}:end={blip_time:.3f}'

            # 2. align the audio start to the reference metronome
            reference_start_time = 0 if blip_index == 0 else reference_metro[blip_index - 1]
            delay_command = f'adelay={int(reference_start_time * 1000)}:all=1'

            # 3. and stretch it to fit the reference metronome
            duration = blip_time - start_time
            reference_duration = reference_metro[blip_index] - reference_start_time
            stretch_rate = duration / reference_duration
            stretch_command = f'atempo={stretch_rate}'

            # string the command together
            slice_input = f'[{metro_index}:a]'
            slice_output = f'[a{metro_index}slice{blip_index}]'
            pts_command = 'asetpts=PTS-STARTPTS'
            slice_n_stretch_commands.append(
                f'{slice_input} {pts_command}, {slice_command}, {delay_command}, {stretch_command} {slice_output};'
            )
            merge_inputs.append(slice_output)

    # merge all the little slices
    audio_merge_command = f'{"".join(merge_inputs)} amix=inputs={len(merge_inputs)}:duration=longest, dynaudnorm [outa];'

    # and stack all the videos into a grid
    video_inputs = ''.join([
        f'[{input_number}:v]'
        for input_number
        in range(num_peers)
    ])
    video_coordinates = []
    num_rows = ceil(sqrt(num_peers))
    for row in range(num_rows):
        num_cols = num_rows
        if row == num_rows - 1:
            num_cols = num_peers - (num_rows * row)
        x_start = row * num_rows
        for col in range(num_cols):
            if col == 0:
                x = '0'
            else:
                x = '+'.join([ f'w{c}' for c in range(col) ])
            if row == 0:
                y = '0'
            else:
                y = '+'.join([ f'h{r}' for r in range(0, row * num_rows, num_rows) ])
            video_coordinates.append(f'{x}_{y}')
    video_layout = '|'.join(video_coordinates)
    video_stack_command = f'{video_inputs} xstack=inputs={num_peers}:layout={video_layout} [outv]'

    # use the video as input -
    # the regular audio will stretch
    # according to the metronome audio
    ffmpeg_inputs = ' \\\n  '.join([
        f'-i output/peer{peer_number}_video.webm'
        for peer_number
        in range(num_peers)
    ])

    nl = ' \\\n    '
    ffmpeg_command = f'''
ffmpeg \\
  {ffmpeg_inputs} \\
  -filter_complex \\
   "{nl.join(slice_n_stretch_commands)} \\
    {audio_merge_command} \\
    {video_stack_command}" \\
  -map "[outa]" \\
  -map "[outv]" \\
  -ac 2 \\
  output/cascade0.webm
'''
    # print(ffmpeg_command)
    subprocess.run(ffmpeg_command, check=True, shell=True)

if __name__ == '__main__':
    num_peers = int(sys.argv[1])
    align_videos_to_metronome(num_peers)
