/*
 *  Copyright (c) 2011 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree. An additional intellectual property rights grant can be found
 *  in the file PATENTS.  All contributing project authors may
 *  be found in the AUTHORS file in the root of the source tree.
 */

/*
 * RTP data struct and related functions.
 */

#ifndef RTP_H
#define RTP_H

#include "typedefs.h"

#include "codec_db.h"

typedef struct
{
    uint16_t seqNumber;
    uint32_t timeStamp;
    uint32_t ssrc;
    int payloadType;
    const int16_t *payload;
    int16_t payloadLen;
    int16_t starts_byte1;
    int16_t rcuPlCntr;
} RTPPacket_t;

/****************************************************************************
 * WebRtcNetEQ_RTPPayloadInfo(...)
 *
 * Converts a datagram into an RTP header struct.
 *
 * Input:
 *		- Datagram		: UDP datagram from the network
 *		- DatagramLen	: Length in bytes of the datagram
 *
 * Output:
 *		- RTPheader		: Structure with the datagram info
 *
 * Return value			:  0 - Ok
 *						  -1 - Error
 */

int WebRtcNetEQ_RTPPayloadInfo(int16_t* pw16_Datagram, int i_DatagramLen,
                               RTPPacket_t* RTPheader);

/****************************************************************************
 * WebRtcNetEQ_RedundancySplit(...)
 *
 * Splits a Redundancy RTP struct into two RTP structs. User has to check 
 * that it's really the redundancy payload. No such check is done inside this
 * function.
 *
 * Input:
 *		- RTPheader		: First header holds the whole RTP packet (with the redundancy payload)
 *		- MaximumPayloads: 
 *						  The maximum number of RTP payloads that should be
 *						  extracted (1+maximum_no_of_Redundancies).
 *
 * Output:
 *		- RTPheader		: First header holds the main RTP data, while 2..N 
 *						  holds the redundancy data.
 *		- No_Of
 *
 * Return value			:  0 - Ok
 *						  -1 - Error
 */

int WebRtcNetEQ_RedundancySplit(RTPPacket_t* RTPheader[], int i_MaximumPayloads,
                                int *i_No_Of_Payloads);

#endif
