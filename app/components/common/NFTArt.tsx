import { Stream } from '@cloudflare/stream-react';
import { LoadingArtPlaceholder } from '@components/common/LoadingArtPlaceholder';
import ErrorLogo from '@img/logos-solana/dark-solana-logo.svg';
import { MetadataJson, MetaDataJsonCategory, MetadataJsonFile } from '@metaplex/js';
import { PublicKey } from '@solana/web3.js';
import { getLast } from '@utils/index';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

export const MAX_TIME_LOADING_IMAGE = 5000; /* 5 seconds */

const ErrorPlaceHolder = () => <Image src={ErrorLogo} width={120} height={120} alt="Solana Logo" />;

const ViewOriginalArtContentLink = ({ src }: { src: string }) => {
    if (!src) {
        return null;
    }

    return (
        <h6 className={'header-pretitle d-flex justify-content-center mt-2'}>
            <Link href={src} target="_blank">
                VIEW ORIGINAL
            </Link>
        </h6>
    );
};

export const NFTImageContent = ({ uri }: { uri?: string }) => {
    const [isLoading, setIsLoading] = useState(true);

    return (
        <div style={{ maxHeight: 200, width: 150 }}>
            {isLoading && <LoadingArtPlaceholder />}
            <div
                className={`rounded mx-auto ${isLoading ? 'd-none' : 'd-block'}`}
                style={{ overflow: 'hidden' }}
            >
                <img alt="nft" src={uri} width="100%" onLoad={() => setIsLoading(false)} />
            </div>
            {!isLoading && uri && <ViewOriginalArtContentLink src={uri} />}
        </div>
    );
};

const VideoArtContent = ({
    files,
    uri,
    animationURL,
}: {
    files?: (MetadataJsonFile | string)[];
    uri?: string;
    animationURL?: string;
}) => {
    const likelyVideo = (files || []).filter((f, index, arr) => {
        if (typeof f !== 'string') {
            return false;
        }

        // TODO: filter by fileType
        return arr.length >= 2 ? index === 1 : index === 0;
    })?.[0] as string;

    const content =
        likelyVideo && likelyVideo.startsWith('https://watch.videodelivery.net/') ? (
            <div className={'d-block'}>
                <Stream
                    src={likelyVideo.replace('https://watch.videodelivery.net/', '')}
                    loop={true}
                    height={180}
                    width={320}
                    controls={false}
                    style={{ borderRadius: 12 }}
                    videoDimensions={{
                        videoHeight: 180,
                        videoWidth: 320,
                    }}
                    autoplay={true}
                    muted={true}
                />
                <ViewOriginalArtContentLink src={likelyVideo.replace('https://watch.videodelivery.net/', '')} />
            </div>
        ) : (
            <div className={'d-block'}>
                <video
                    playsInline={true}
                    autoPlay={true}
                    muted={true}
                    controls={true}
                    controlsList="nodownload"
                    style={{ borderRadius: 12, height: 180, width: 320 }}
                    loop={true}
                    poster={uri}
                >
                    {likelyVideo && <source src={likelyVideo} type="video/mp4" />}
                    {animationURL && <source src={animationURL} type="video/mp4" />}
                    {files
                        ?.filter(f => typeof f !== 'string')
                        .map((f: any, index: number) => (
                            <source key={index} src={f.uri} type={f.type} />
                        ))}
                </video>
                {(likelyVideo || animationURL) && <ViewOriginalArtContentLink src={(likelyVideo || animationURL)!} />}
            </div>
        );

    return content;
};

const HTMLContent = ({ animationUrl, files }: { animationUrl?: string; files?: (MetadataJsonFile | string)[] }) => {
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [showError, setShowError] = useState<boolean>(false);
    const htmlURL = files && files.length > 0 && typeof files[0] === 'string' ? files[0] : animationUrl;

    return (
        <>
            {showError ? (
                <div className={'art-error-image-placeholder'}>
                    <ErrorPlaceHolder />
                    <h6 className={'header-pretitle mt-2'}>Error Loading Image</h6>
                </div>
            ) : (
                <>
                    {!isLoading && <LoadingArtPlaceholder />}
                    <div className={`${isLoading ? 'd-block' : 'd-none'}`}>
                        <iframe
                            allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                            title={'html-content'}
                            sandbox="allow-scripts"
                            frameBorder="0"
                            src={htmlURL}
                            style={{ borderRadius: 12, height: 180, width: 320 }}
                            onLoad={() => {
                                setIsLoading(true);
                            }}
                            onError={() => {
                                setShowError(true);
                            }}
                        ></iframe>
                        {!isLoading && htmlURL && <ViewOriginalArtContentLink src={htmlURL} />}
                    </div>
                </>
            )}
        </>
    );
};

export const ArtContent = ({
    category,
    pubkey,
    uri,
    animationURL,
    files,
    data,
}: {
    category?: MetaDataJsonCategory;
    pubkey?: PublicKey | string;
    uri?: string;
    animationURL?: string;
    files?: (MetadataJsonFile | string)[];
    data: MetadataJson | undefined;
}) => {
    if (pubkey && data) {
        uri = data.image;
        animationURL = data.animation_url;
    }

    if (pubkey && data?.properties) {
        files = data.properties.files;
        category = data.properties.category;
    }

    animationURL = animationURL || '';

    const animationUrlExt = new URLSearchParams(getLast(animationURL.split('?'))).get('ext');

    const content =
        category === 'video' ? (
            <VideoArtContent files={files} uri={uri} animationURL={animationURL} />
        ) : category === 'html' || animationUrlExt === 'html' ? (
            <HTMLContent animationUrl={animationURL} files={files} />
        ) : (
            <NFTImageContent uri={uri} />
        );

    return (
        <div
            style={{
                alignItems: 'center',
                display: 'flex',
                justifyContent: 'center',
            }}
        >
            {content}
        </div>
    );
};
