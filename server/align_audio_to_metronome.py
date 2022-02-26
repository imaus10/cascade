from glob import glob
from math import ceil, sqrt
import subprocess
import sys

import librosa
import numpy as np


def get_num_peers(cascade_dir):
    '''
    Get the number of peers by looking at
    the files in the cascade's output dir.
    '''
    num_peers = len(glob(f'{cascade_dir}/peer*_metronome.webm'))
    if len(glob(f'{cascade_dir}/peer*_video.webm')) != num_peers:
        raise Exception(f'Missing files.')
    return num_peers


def detect_blip_onsets(metro_filename):
    '''
    Load the metronome audio and detect the beat onsets.
    '''
    print(f'loading {metro_filename}')
    metronome, sample_rate = librosa.load(metro_filename)
    onset_frames = librosa.onset.onset_detect(metronome, sr=sample_rate)
    onset_times = librosa.frames_to_time(onset_frames)
    # onset_times has both on and off times (is an off the onset of silence? 🤔)
    # remove the first marker if it's an off marker
    if (onset_times[1] - onset_times[0]) > 0.2:
        onset_times = onset_times[1:]
    # it has been observed in practice that
    # sometimes the detector will miss the on marker but not the off marker.
    # in this case we'd rather use the off marker than drop a metronome blip.
    is_on_marker = np.insert(
        # if the blip is more than 200ms from the previous marker, call it an onset.
        np.diff(onset_times) > 0.2,
        # and always keep the first marker
        0,
        [True]
    )
    return onset_times[is_on_marker]


def align_beats(metronomes):
    '''
    Sometimes streaming has a hiccup and one beat
    is sliced into what sounds like multiple beats.
    To get around this, we align each reference beat
    to the closest beat heard by each peer.
    '''
    # this is the naive version:
    # if there are uneven number of blips,
    # chop off the extra blips from the end
    # (TODO: what it says in the docstring)
    num_slices = min([
        len(metro)
        for metro
        in metronomes
    ])
    return [
        metro[:num_slices]
        for metro
        in metronomes
    ]


def align_videos_to_metronome(cascade_dir):
    '''
    Generate the ffmpeg command
    to timestretch the audio according to the reference metronome
    and stack the videos into a grid.
    '''
    num_peers = get_num_peers(cascade_dir)

    # TODO: multiprocess this part?
    metronomes = align_beats([
        detect_blip_onsets(f'{cascade_dir}/peer{peer_number}_metronome.webm')
        for peer_number
        in range(num_peers)
    ])
    reference_metro = metronomes[0]
    num_slices = len(reference_metro)

    slice_n_stretch_commands = []
    merge_inputs = []
    for metro_index, metronome in enumerate(metronomes):
        if metro_index == 0:
            # the first metro is passed thru unchanged
            first_metro = f'[0:a] asetpts=PTS-STARTPTS [a0];'
            slice_n_stretch_commands.append(first_metro)
            merge_inputs.append('[a0]')
            continue

        if len(metronome) != len(reference_metro):
            print(f'Warning: metronome {metro_index} has {len(metronome)} blips but the reference metronome has {len(reference_metro)} blips. The excess blips will be chopped off from the end. If the blip detection missed a blip altogether the end result will probably be messed up. Sorry.')

        for blip_index in range(num_slices):
            blip_time = metronome[blip_index]
            start_time = 0 if blip_index == 0 else metronome[blip_index - 1]
            # 1. trim out each slice of audio
            slice_command = f'atrim=start={start_time:.3f}:end={blip_time:.3f}'

            # 2. stretch it to fit the reference metronome
            duration = blip_time - start_time
            reference_start_time = 0 if blip_index == 0 else reference_metro[blip_index - 1]
            reference_duration = reference_metro[blip_index] - reference_start_time
            stretch_rate = duration / reference_duration
            if stretch_rate < 0.5:
                new_duration = duration / 0.5
                stretch_rate = new_duration / reference_duration
                stretch_command = f'atempo=0.5, atempo={stretch_rate}'
            else:
                stretch_command = f'atempo={stretch_rate}'

            # 3. and align the audio start to the reference metronome
            delay_command = f'adelay={int(reference_start_time * 1000)}:all=1'

            # string the command together
            slice_input = f'[{metro_index}:a]'
            slice_output = f'[a{metro_index}slice{blip_index}]'
            pts_command = 'asetpts=PTS-STARTPTS'
            slice_n_stretch_commands.append(
                f'{slice_input} {pts_command}, {slice_command}, {stretch_command}, {delay_command} {slice_output};'
            )
            merge_inputs.append(slice_output)

    # merge all the little slices
    audio_merge_command = f'{"".join(merge_inputs)} amix=inputs={len(merge_inputs)}:duration=longest:dropout_transition=0 [outa];'

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
    ffmpeg_inputs = ' \\\n          '.join([
        f'-i "{cascade_dir}/peer{peer_number}_video.webm"'
        for peer_number
        in range(num_peers)
    ])

    nl = ' \\\n            '
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
          {cascade_dir}/cascade.webm
'''
    # print(ffmpeg_command)
    subprocess.run(ffmpeg_command, check=True, shell=True)


if __name__ == '__main__':
    cascade_dir = sys.argv[1]
    align_videos_to_metronome(cascade_dir)
