import defineGenericAnnotation from 'defineGenericAnnotation';
import React from 'react';
import { wait } from 'utils';
import { PdfAnnotationProps } from './types';

export default ({ vault, plugin }) => {
    const GenericAnnotationPdf = defineGenericAnnotation({ vault, plugin });
    const PdfAnnotation = ({ onload, ...props }: PdfAnnotationProps) => {
        return (
            <GenericAnnotationPdf
                baseSrc="https://via.hypothes.is/https.html"
                {...props}
                onload={async iframe => {
                    let pdfJsFrame;
                    do {
                        await wait(100);
                        pdfJsFrame = iframe.contentDocument.getElementsByTagName('iframe')[0];
                    } while (
                        pdfJsFrame == null ||
                        !pdfJsFrame.contentDocument?.addEventListener ||
                        !pdfJsFrame.contentWindow?.PDFViewerApplication?.pdfViewer
                    );

                    const document = pdfJsFrame.contentDocument;
                    const { PDFViewerApplication } = pdfJsFrame.contentWindow;

                    let startX = 0,
                        startY = 0;
                    let initialPinchDistance = 0;
                    let pinchScale = 1;
                    const viewer = document.getElementById('viewer');
                    const container = document.getElementById('viewerContainer');
                    const reset = () => {
                        startX = startY = initialPinchDistance = 0;
                        pinchScale = 1;
                    };
                    // Prevent native iOS page zoom
                    //document.addEventListener("touchmove", (e) => { if (e.scale !== 1) { e.preventDefault(); } }, { passive: false });
                    document.addEventListener('touchstart', e => {
                        if (e.touches.length > 1) {
                            startX = (e.touches[0].pageX + e.touches[1].pageX) / 2;
                            startY = (e.touches[0].pageY + e.touches[1].pageY) / 2;
                            initialPinchDistance = Math.hypot(
                                e.touches[1].pageX - e.touches[0].pageX,
                                e.touches[1].pageY - e.touches[0].pageY
                            );
                        } else {
                            initialPinchDistance = 0;
                        }
                    });
                    document.addEventListener(
                        'touchmove',
                        e => {
                            if (initialPinchDistance <= 0 || e.touches.length < 2) {
                                return;
                            }
                            if (e.scale !== 1) {
                                e.preventDefault();
                            }
                            const pinchDistance = Math.hypot(
                                e.touches[1].pageX - e.touches[0].pageX,
                                e.touches[1].pageY - e.touches[0].pageY
                            );
                            const originX = startX + container.scrollLeft;
                            const originY = startY + container.scrollTop;
                            pinchScale = pinchDistance / initialPinchDistance;
                            viewer.style.transform = `scale(${pinchScale})`;
                            viewer.style.transformOrigin = `${originX}px ${originY}px`;
                        },
                        { passive: false }
                    );
                    document.addEventListener('touchend', () => {
                        if (initialPinchDistance <= 0) {
                            return;
                        }
                        viewer.style.transform = `none`;
                        viewer.style.transformOrigin = `unset`;
                        PDFViewerApplication.pdfViewer.currentScale *= pinchScale;
                        const rect = container.getBoundingClientRect();
                        const dx = startX - rect.left;
                        const dy = startY - rect.top;
                        container.scrollLeft += dx * (pinchScale - 1);
                        container.scrollTop += dy * (pinchScale - 1);
                        reset();
                    });
                    await onload(iframe);
                }}
            />
        );
    };
    return PdfAnnotation;
};
